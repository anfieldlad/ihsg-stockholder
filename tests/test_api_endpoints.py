"""
tests/test_api_endpoints.py - API Routing & Security Tests
Verifies /api routing, response shapes, batch cap 50, and SEC-02 public root leak protection.
"""

import subprocess
import pytest
from server import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_status_endpoint(client):
    """GET /api returns healthy status JSON with service name."""
    res = client.get("/api")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert "IHSG Storm API" in data["service"]


def test_api_health_endpoint(client):
    """GET /api/health returns healthy status JSON."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"


def test_unknown_api_endpoint_returns_404(client):
    """M0-2: Unknown /api/x routes must return 404, NOT the health JSON."""
    for unknown_path in ["/api/x", "/api/nonexistent", "/api/foo/bar", "/api/prices_fake"]:
        res = client.get(unknown_path)
        assert res.status_code == 404, f"Expected 404 for {unknown_path}, got {res.status_code}"


def test_cache_clear_removed_or_guarded(client):
    """M0-5 / SEC-12: /api/cache/clear must be removed (returns 404)."""
    res = client.get("/api/cache/clear")
    assert res.status_code == 404


def test_api_cache_stats(client):
    """GET /api/cache/stats provides read-only diagnostics."""
    res = client.get("/api/cache/stats")
    assert res.status_code == 200
    data = res.get_json()
    assert "active_entries" in data


def test_single_price_shape_m0_2(client):
    """M0-2: GET /api/price/BBCA must return 200 with 'code' key and price data."""
    res = client.get("/api/price/BBCA")
    assert res.status_code == 200
    data = res.get_json()
    assert isinstance(data, dict)
    assert "code" in data, "Response MUST contain 'code' key"
    assert data["code"] == "BBCA"
    assert "last_price" in data
    assert "public, s-maxage=60" in res.headers.get("Cache-Control", "")


def test_price_ticker_validation(client):
    """B4: Validates ticker format ^[A-Z0-9]{4}$."""
    for bad_code in ["INVALID", "B$CA", "12", ""]:
        res = client.get(f"/api/price/{bad_code}")
        assert res.status_code in [400, 404]


def test_batch_prices_shape_and_cap_50(client):
    """M0-2 & M0-5: GET /api/prices must contain 'prices' key and cap at 50 (not 30)."""
    # Empty query
    res_empty = client.get("/api/prices")
    assert res_empty.status_code == 400

    # All invalid tickers
    res_bad = client.get("/api/prices?codes=TOOLONG,X,1")
    assert res_bad.status_code == 400

    # Single and multi-code shape check
    res_shape = client.get("/api/prices?codes=BBCA,BBRI")
    assert res_shape.status_code == 200
    data_shape = res_shape.get_json()
    assert "prices" in data_shape, "Response MUST contain 'prices' key"
    assert "BBCA" in data_shape["prices"]
    assert "BBRI" in data_shape["prices"]
    assert data_shape["prices"]["BBCA"]["code"] == "BBCA"

    # Batch capped at 50 (M0-5 fix: was 30)
    tickers_list = [f"TK{i:02d}" for i in range(60)]
    res_batch = client.get(f"/api/prices?codes={','.join(tickers_list)}")
    assert res_batch.status_code == 200
    data = res_batch.get_json()
    assert "prices" in data
    assert data["count"] <= 50, f"Expected count <= 50, got {data['count']}"
    assert len(data["prices"]) <= 50


def test_static_index_and_assets_from_public(client):
    """SEC-02: Public assets in public/ are served normally."""
    res_index = client.get("/")
    assert res_index.status_code == 200
    html = res_index.data.decode("utf-8")
    assert "IHSG Storm" in html
    assert "assets/css/style.css" in html

    res_css = client.get("/assets/css/style.css")
    assert res_css.status_code == 200
    css = res_css.data.decode("utf-8")
    assert "--font" in css
    assert "--bg" in css

    res_data = client.get("/shareholder_data.json")
    assert res_data.status_code == 200
    data_json = res_data.get_json()
    assert "items" in data_json

    res_ico = client.get("/favicon.ico")
    assert res_ico.status_code in [200, 204]


def test_sec_02_source_and_data_files_not_downloadable(client):
    """SEC-02: server.py, *.xlsx, tests, requirements are NOT reachable (return 404)."""
    blocked_paths = [
        "/server.py",
        "/requirements.txt",
        "/requirements-dev.txt",
        "/requirements-ingest.txt",
        "/tests/test_api_endpoints.py",
        "/scripts/shareholder_data_SEP2026.xlsx",
        "/feedback_submissions.json",
        "/.env",
        "/.git/config"
    ]
    for p in blocked_paths:
        res = client.get(p)
        assert res.status_code == 404, f"Security leak! {p} returned {res.status_code} instead of 404"


def test_vercel_middleware_route_restoration(client):
    """M0-2: VercelPathMiddleware restores PATH_INFO from HTTP_X_MATCHED_PATH and __route."""
    # 1. Test restoration via HTTP_X_MATCHED_PATH
    res_header = client.get("/api/index", headers={"X-Matched-Path": "/api/price/BBCA"})
    assert res_header.status_code == 200
    data_header = res_header.get_json()
    assert "code" in data_header
    assert data_header["code"] == "BBCA"

    # 2. Test restoration via __route query param
    res_query = client.get("/api/index?__route=price/BBCA")
    assert res_query.status_code == 200
    data_query = res_query.get_json()
    assert "code" in data_query
    assert data_query["code"] == "BBCA"

    # 3. Test unknown route via __route returns 404
    res_unknown = client.get("/api/index?__route=nonexistent")
    assert res_unknown.status_code == 404


def test_node_module_imports():
    """Verify Node module imports and contracts pass."""
    res = subprocess.run(
        ["node", "tests/test_module_imports.js"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"Node module imports failed:\n{res.stdout}\n{res.stderr}"


def test_node_max_holders_and_aadi():
    """Verify max holder calculations and AADI 41.1%."""
    res = subprocess.run(
        ["node", "tests/test_max_holders.js"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"Node max holders verification failed:\n{res.stdout}\n{res.stderr}"
