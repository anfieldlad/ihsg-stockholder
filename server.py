"""
IHSG Storm - Backend Server
============================================
Flask server that serves the dashboard and proxies Yahoo Finance for live stock prices.

Usage: python server.py
"""

import json
import os
import time
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

from flask import Flask, jsonify, send_from_directory, request, Response
from flask_cors import CORS

from api.services.yahoo import fetch_single_price, fetch_batch_prices

app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

# ── In-memory cache to avoid hammering Yahoo Finance ──
price_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL: int = 300  # 5 minutes


def get_cached_price(code: str) -> Optional[Dict[str, Any]]:
    """Get price from cache if still fresh."""
    if code in price_cache:
        entry = price_cache[code]
        if time.time() - entry.get("_fetched_at", 0) < CACHE_TTL:
            return entry
    return None


# ── Static file routes ──

@app.route("/")
def index() -> Response:
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def static_files(filename: str) -> Response:
    return send_from_directory(".", filename)


# ── API routes ──

@app.route("/api")
@app.route("/api/index")
@app.route("/api/health")
def api_status() -> Response:
    """API health and routing status endpoint."""
    return jsonify({
        "status": "ok",
        "service": "IHSG Storm API",
        "timestamp": datetime.now().isoformat()
    })


@app.route("/api/price/<code>")
def get_price(code: str) -> Response:
    """Get live price for a single stock."""
    code = code.upper()
    cached = get_cached_price(code)
    if cached:
        result = {k: v for k, v in cached.items() if not k.startswith("_")}
        result["cached"] = True
        return jsonify(result)

    result = fetch_single_price(code)
    # cache it
    price_cache[code] = result
    
    clean = {k: v for k, v in result.items() if not k.startswith("_")}
    clean["cached"] = False
    return jsonify(clean)


@app.route("/api/prices")
def get_prices() -> Response:
    """
    Get live prices for multiple stocks.
    Query param: codes=BBCA,BBRI,TLKM (comma-separated, max 50)
    """
    codes_param: str = request.args.get("codes", "")
    if not codes_param:
        return jsonify({"error": "Missing 'codes' query parameter"}), 400

    codes: List[str] = [c.strip().upper() for c in codes_param.split(",") if c.strip()]
    if len(codes) > 50:
        codes = codes[:50]

    # Check cache first
    to_fetch: List[str] = []
    results: Dict[str, Dict[str, Any]] = {}
    for code in codes:
        cached = get_cached_price(code)
        if cached:
            clean = {k: v for k, v in cached.items() if not k.startswith("_")}
            clean["cached"] = True
            results[code] = clean
        else:
            to_fetch.append(code)

    # Fetch uncached
    if to_fetch:
        fetched = fetch_batch_prices(to_fetch)
        for code, data in fetched.items():
            price_cache[code] = data
            clean = {k: v for k, v in data.items() if not k.startswith("_")}
            clean["cached"] = False
            results[code] = clean

    return jsonify({
        "prices": results,
        "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(results),
    })


@app.route("/api/cache/clear")
def clear_cache() -> Response:
    """Clear the price cache."""
    price_cache.clear()
    return jsonify({"message": "Cache cleared", "timestamp": datetime.now().isoformat()})


@app.route("/api/cache/stats")
def cache_stats() -> Response:
    """Get cache statistics."""
    now = time.time()
    active = sum(1 for v in price_cache.values() if now - v.get("_fetched_at", 0) < CACHE_TTL)
    return jsonify({
        "total_entries": len(price_cache),
        "active_entries": active,
        "ttl_seconds": CACHE_TTL,
    })


# ── Customer Success & Feedback routes ──

FEEDBACK_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "feedback_submissions.json")
FALLBACK_FEEDBACK_FILE = "/tmp/feedback_submissions.json"
COMPANY_FEEDBACK_FILE = "/home/hermes/company/ihsg/feedback_submissions.json"


@app.route("/api/feedback", methods=["POST"])
def submit_feedback() -> Response:
    """
    Handle user feedback & data correction reports.
    Accepts JSON with keys:
      category, context_type, entity_code, entity_name,
      error_type, description, reference_url, reporter_contact, client_info
    """
    try:
        data = request.get_json(silent=True) or {}
    except Exception:
        return jsonify({"error": "Payload JSON tidak valid"}), 400

    description = (data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "Harap isi deskripsi laporan atau kendala yang ditemukan."}), 400

    ticket_id = f"TICK-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
    timestamp = data.get("timestamp") or datetime.utcnow().isoformat() + "Z"

    entry = {
        "ticket_id": ticket_id,
        "timestamp": timestamp,
        "category": data.get("category", "data_error"),
        "context_type": data.get("context_type", "general"),
        "entity_code": (data.get("entity_code") or "").strip().upper(),
        "entity_name": (data.get("entity_name") or "").strip(),
        "data_as_of": data.get("data_as_of", "Unknown"),
        "error_type": data.get("error_type", "glued_token"),
        "description": description,
        "reference_url": (data.get("reference_url") or "").strip(),
        "reporter_contact": (data.get("reporter_contact") or "").strip(),
        "client_info": data.get("client_info") or {},
        "status": "pending_triage",
        "received_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }

    # Persist entry to primary file with fallback to /tmp
    for path in [FEEDBACK_FILE, FALLBACK_FEEDBACK_FILE]:
        try:
            records = []
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        records = json.load(f)
                    if not isinstance(records, list):
                        records = []
                except Exception:
                    records = []
            records.append(entry)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2, ensure_ascii=False)
            break
        except Exception:
            continue

    # Also sync to company logs if directory exists
    try:
        if os.path.isdir("/home/hermes/company/ihsg"):
            company_records = []
            if os.path.exists(COMPANY_FEEDBACK_FILE):
                try:
                    with open(COMPANY_FEEDBACK_FILE, "r", encoding="utf-8") as f:
                        company_records = json.load(f)
                    if not isinstance(company_records, list):
                        company_records = []
                except Exception:
                    company_records = []
            company_records.append(entry)
            with open(COMPANY_FEEDBACK_FILE, "w", encoding="utf-8") as f:
                json.dump(company_records, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

    return jsonify({
        "success": True,
        "ticket_id": ticket_id,
        "message": "Laporan berhasil diterima dan masuk ke antrean audit data.",
        "entry": entry
    }), 201


@app.route("/api/feedback", methods=["GET"])
def list_feedback() -> Response:
    """
    List logged feedback entries for triage (internal query).
    Optional query params: category, status, limit
    """
    records = []
    for path in [FEEDBACK_FILE, FALLBACK_FEEDBACK_FILE, COMPANY_FEEDBACK_FILE]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and data:
                        records = data
                        break
            except Exception:
                pass

    category = request.args.get("category")
    if category:
        records = [r for r in records if r.get("category") == category]

    limit = request.args.get("limit", 50, type=int)
    return jsonify({
        "count": len(records),
        "feedback": records[-limit:]
    })


if __name__ == "__main__":
    print("=" * 50)
    print("  IHSG Storm Server")
    print(f"  http://localhost:5000")
    print("=" * 50)
    print()
    print("  API Endpoints:")
    print("    GET /api/price/<CODE>        - Single stock price")
    print("    GET /api/prices?codes=A,B,C  - Batch prices (max 50)")
    print("    GET /api/cache/clear         - Clear price cache")
    print("    GET /api/cache/stats         - Cache statistics")
    print()
    app.run(host="0.0.0.0", port=5000, debug=True)
