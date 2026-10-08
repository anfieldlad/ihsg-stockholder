import json
import pytest
from server import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_feedback_submission_success(client):
    payload = {
        "category": "data_error",
        "context_type": "stock",
        "entity_code": "BBCA",
        "entity_name": "BANK CENTRAL ASIA TBK",
        "data_as_of": "29-May-2026",
        "error_type": "glued_token",
        "description": "Nama pemegang saham ke-3 menempel dengan kata Tbk.",
        "reference_url": "https://www.idx.co.id/",
        "reporter_contact": "investor@example.com",
        "client_info": {
            "url": "https://ihsg.badai.tech/#/stock/BBCA",
            "screen": "1440x900"
        }
    }
    res = client.post("/api/feedback", json=payload)
    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert "ticket_id" in data
    assert data["ticket_id"].startswith("TICK-")
    assert data["entry"]["entity_code"] == "BBCA"
    assert data["entry"]["error_type"] == "glued_token"

def test_feedback_submission_empty_description(client):
    payload = {
        "category": "data_error",
        "entity_code": "BBCA",
        "description": "   "
    }
    res = client.post("/api/feedback", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert "error" in data

def test_feedback_get_list(client):
    res = client.get("/api/feedback")
    assert res.status_code == 200
    data = res.get_json()
    assert "feedback" in data
    assert isinstance(data["feedback"], list)
