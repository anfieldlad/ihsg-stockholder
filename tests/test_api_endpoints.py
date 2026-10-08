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
