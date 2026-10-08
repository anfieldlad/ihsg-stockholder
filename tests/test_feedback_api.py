import os
import json
import pytest
from unittest.mock import patch, MagicMock
from server import app

@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client

def test_feedback_get_removed_b1(client):
    """B1: GET /api/feedback must not be available."""
    res = client.get("/api/feedback")
    assert res.status_code in [404, 405]

def test_feedback_unconfigured_flag_b2(client):
    """B2: When FEEDBACK_WEBHOOK_URL is not set, returns 503."""
    with patch.dict(os.environ, {"FEEDBACK_WEBHOOK_URL": ""}):
        import server
        server.FEEDBACK_WEBHOOK_URL = ""
        res = client.post("/api/feedback", json={"description": "Test issue"})
        assert res.status_code == 503
        data = res.get_json()
        assert data.get("available") is False

def test_feedback_submission_success_with_webhook_b2(client):
    """B2: When webhook is configured, payload forwarded and 201 returned."""
    mock_resp = MagicMock()
    mock_resp.status = 200
    mock_resp.__enter__.return_value = mock_resp

    with patch.dict(os.environ, {"FEEDBACK_WEBHOOK_URL": "https://hooks.example.com/feedback"}), \
         patch("urllib.request.urlopen", return_value=mock_resp):
        import server
        server.FEEDBACK_WEBHOOK_URL = "https://hooks.example.com/feedback"
        payload = {
            "category": "data_error",
            "context_type": "stock",
            "entity_code": "BBCA",
            "entity_name": "BANK CENTRAL ASIA TBK",
            "data_as_of": "30-Sep-2026",
            "error_type": "glued_token",
            "description": "Nama pemegang saham menempel dengan kata Tbk.",
            "reference_url": "https://www.idx.co.id/",
            "reporter_contact": "investor@example.com"
        }
        res = client.post("/api/feedback", json=payload)
        assert res.status_code == 201
        data = res.get_json()
        assert data["success"] is True
        assert "ticket_id" in data
        assert data["ticket_id"].startswith("TICK-")

def test_feedback_submission_empty_description_b2(client):
    with patch.dict(os.environ, {"FEEDBACK_WEBHOOK_URL": "https://hooks.example.com/feedback"}):
        import server
        server.FEEDBACK_WEBHOOK_URL = "https://hooks.example.com/feedback"
        payload = {
            "category": "data_error",
            "entity_code": "BBCA",
            "description": "   "
        }
        res = client.post("/api/feedback", json=payload)
        assert res.status_code == 400
        data = res.get_json()
        assert "error" in data

def test_feedback_payload_too_large_b2(client):
    with patch.dict(os.environ, {"FEEDBACK_WEBHOOK_URL": "https://hooks.example.com/feedback"}):
        import server
        server.FEEDBACK_WEBHOOK_URL = "https://hooks.example.com/feedback"
        large_desc = "x" * 5000
        res = client.post("/api/feedback", json={"description": large_desc})
        assert res.status_code in [400, 413]
