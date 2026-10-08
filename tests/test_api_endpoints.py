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
