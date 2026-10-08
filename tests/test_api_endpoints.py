import pytest
from server import app


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_api_status_endpoint(client):
    res = client.get("/api")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert "IHSG Storm API" in data["service"]


def test_api_index_endpoint(client):
    res = client.get("/api/index")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"


def test_api_health_endpoint(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"


def test_api_cache_stats(client):
    res = client.get("/api/cache/stats")
    assert res.status_code == 200
    data = res.get_json()
    assert "active_entries" in data


def test_static_index_and_v2_assets(client):
    res_index = client.get("/")
    assert res_index.status_code == 200
    html = res_index.data.decode("utf-8")
    assert "IHSG Storm" in html
    assert "assets/css/style.css" in html
    assert "cdn.tailwindcss.com" not in html
    assert "chart.umd.min.js" not in html

    res_css = client.get("/assets/css/style.css")
    assert res_css.status_code == 200
    css = res_css.data.decode("utf-8")
    assert "--font" in css
    assert "--bg" in css

    res_font = client.get("/assets/fonts/fonts.css")
    assert res_font.status_code == 200


def test_price_ticker_validation_b4(client):
    """B4: Validates ticker format ^[A-Z0-9]{4}$."""
    # Invalid tickers
    res_bad1 = client.get("/api/price/INVALID")
    assert res_bad1.status_code == 400
    res_bad2 = client.get("/api/price/B$CA")
    assert res_bad2.status_code == 400
    res_bad3 = client.get("/api/price/12")
    assert res_bad3.status_code == 400

    # Valid ticker format
    res_valid = client.get("/api/price/BBCA")
    assert res_valid.status_code == 200
    # Cache-Control header verified
    assert "public, s-maxage=60" in res_valid.headers.get("Cache-Control", "")


def test_batch_prices_validation_and_cap_b4(client):
    """B4: Batch prices caps at 30, validates tickers, sets Cache-Control."""
    # Empty query
    res_empty = client.get("/api/prices")
    assert res_empty.status_code == 400

    # All invalid tickers
    res_bad = client.get("/api/prices?codes=TOOLONG,X,1")
    assert res_bad.status_code == 400

    # Valid batch capped at 30
    tickers_list = [f"TK{i:02d}" for i in range(40)]
    res_batch = client.get(f"/api/prices?codes={','.join(tickers_list)}")
    assert res_batch.status_code == 200
    data = res_batch.get_json()
    assert data["count"] <= 30
    assert "public, s-maxage=60" in res_batch.headers.get("Cache-Control", "")


def test_node_module_imports():
    import subprocess
    res = subprocess.run(
        ["node", "tests/test_module_imports.js"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"Node module imports failed:\n{res.stdout}\n{res.stderr}"


def test_node_max_holders_and_aadi():
    import subprocess
    res = subprocess.run(
        ["node", "tests/test_max_holders.js"],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"Node max holders verification failed:\n{res.stdout}\n{res.stderr}"
