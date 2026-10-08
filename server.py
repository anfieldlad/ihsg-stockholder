"""
IHSG Storm - Hardened Backend Server
============================================
Flask server that serves the dashboard and proxies Yahoo Finance for live stock prices.
Hardened per security & release requirements (B1-B5).
"""

import os
import re
import time
import uuid
import json
import urllib.request
import urllib.error
from datetime import datetime
from typing import Dict, Any, Optional, List

from flask import Flask, jsonify, send_from_directory, request, Response
from flask_cors import CORS

from api.services.yahoo import fetch_single_price, fetch_batch_prices

app = Flask(__name__, static_folder=".", static_url_path="")

# ── B5: Restricted CORS Configuration ──
env_cors = os.environ.get("CORS_ALLOWED_ORIGINS", "")
if env_cors:
    allowed_origins = [o.strip() for o in env_cors.split(",") if o.strip()]
else:
    allowed_origins = [
        "https://ihsg.badai.tech",
        re.compile(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$")
    ]
CORS(app, origins=allowed_origins)

# ── In-memory price cache ──
price_cache: Dict[str, Dict[str, Any]] = {}
CACHE_TTL: int = 300  # 5 minutes
TICKER_RE = re.compile(r"^[A-Z0-9]{4}$")

# ── B2: Feedback Feature Flag & Rate Limiting ──
FEEDBACK_WEBHOOK_URL = os.environ.get("FEEDBACK_WEBHOOK_URL", "").strip()
MAX_PAYLOAD_BYTES = 4096
feedback_rate_limit: Dict[str, List[float]] = {}
RATE_LIMIT_WINDOW = 60.0  # seconds
RATE_LIMIT_MAX_REQUESTS = 5


def get_cached_price(code: str) -> Optional[Dict[str, Any]]:
    """Get price from cache if still fresh."""
    if code in price_cache:
        entry = price_cache[code]
        if time.time() - entry.get("_fetched_at", 0) < CACHE_TTL:
            return entry
    return None


def add_cache_headers(response: Response) -> Response:
    """Set Cache-Control so Vercel and edge CDN cache price data."""
    response.headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=300"
    return response


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
        "feedback_enabled": bool(FEEDBACK_WEBHOOK_URL),
        "timestamp": datetime.now().isoformat()
    })


@app.route("/api/price/<code>")
def get_price(code: str) -> Response:
    """Get live price for a single stock with B4 validation and edge caching."""
    code = (code or "").strip().upper()
    if not TICKER_RE.match(code):
        return jsonify({"error": "Format kode emiten tidak valid (harus 4 karakter alfanumerik)."}), 400

    cached = get_cached_price(code)
    if cached:
        result = {k: v for k, v in cached.items() if not k.startswith("_")}
        result["cached"] = True
        return add_cache_headers(jsonify(result))

    result = fetch_single_price(code)
    price_cache[code] = result
    
    clean = {k: v for k, v in result.items() if not k.startswith("_")}
    clean["cached"] = False
    return add_cache_headers(jsonify(clean))


@app.route("/api/prices")
def get_prices() -> Response:
    """
    Get live prices for multiple stocks.
    Query param: codes=BBCA,BBRI,TLKM (comma-separated, max 30)
    """
    codes_param: str = request.args.get("codes", "")
    if not codes_param:
        return jsonify({"error": "Parameter 'codes' tidak boleh kosong"}), 400

    raw_codes: List[str] = [c.strip().upper() for c in codes_param.split(",") if c.strip()]
    if not raw_codes:
        return jsonify({"error": "Parameter 'codes' tidak valid"}), 400

    # Strict B4 ticker validation & cap at 30
    valid_codes = [c for c in raw_codes if TICKER_RE.match(c)]
    if not valid_codes:
        return jsonify({"error": "Tidak ada kode emiten valid (harus 4 karakter alfanumerik)"}), 400

    codes = valid_codes[:30]

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

    resp = jsonify({
        "prices": results,
        "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(results),
    })
    return add_cache_headers(resp)


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


# ── B1 & B2: Hardened Customer Success & Feedback routes ──

@app.route("/api/feedback/status", methods=["GET"])
def feedback_status() -> Response:
    """Check whether feedback reporting webhook is active."""
    return jsonify({"available": bool(FEEDBACK_WEBHOOK_URL)})


@app.route("/api/feedback", methods=["POST"])
def submit_feedback() -> Response:
    """
    Handle user feedback & data correction reports.
    Gated behind FEEDBACK_WEBHOOK_URL feature flag.
    Strict 4KB limit, per-IP rate limit, allow-list, no hard-coded paths.
    """
    if not FEEDBACK_WEBHOOK_URL:
        return jsonify({
            "error": "Layanan pelaporan data belum diaktifkan.",
            "available": False
        }), 503

    # Payload size check
    if request.content_length and request.content_length > MAX_PAYLOAD_BYTES:
        return jsonify({"error": "Ukuran payload melebihi batas maksimum 4KB."}), 413

    # Per-IP Rate limit
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    now = time.time()
    recent = [t for t in feedback_rate_limit.get(client_ip, []) if now - t < RATE_LIMIT_WINDOW]
    if len(recent) >= RATE_LIMIT_MAX_REQUESTS:
        return jsonify({"error": "Terlalu banyak permintaan. Silakan tunggu beberapa saat."}), 429
    recent.append(now)
    feedback_rate_limit[client_ip] = recent

    try:
        raw_body = request.get_data(as_text=True)
        if len(raw_body.encode("utf-8")) > MAX_PAYLOAD_BYTES:
            return jsonify({"error": "Ukuran payload melebihi batas maksimum 4KB."}), 413
        data = json.loads(raw_body) if raw_body else {}
    except Exception:
        return jsonify({"error": "Payload JSON tidak valid"}), 400

    description = str(data.get("description") or "").strip()
    if not description:
        return jsonify({"error": "Harap isi deskripsi laporan atau kendala yang ditemukan."}), 400
    if len(description) > 2000:
        return jsonify({"error": "Deskripsi terlalu panjang (maksimum 2000 karakter)."}), 400

    # Strict field allow-list
    ALLOWED_CATEGORIES = {"data_error", "feature_request", "question"}
    category = str(data.get("category") or "data_error").strip()
    if category not in ALLOWED_CATEGORIES:
        category = "data_error"

    ticket_id = f"TICK-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
    
    clean_payload = {
        "ticket_id": ticket_id,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "category": category,
        "context_type": str(data.get("context_type") or "general")[:50].strip(),
        "entity_code": str(data.get("entity_code") or "")[:10].strip().upper(),
        "entity_name": str(data.get("entity_name") or "")[:100].strip(),
        "data_as_of": str(data.get("data_as_of") or "30-Sep-2026")[:30].strip(),
        "error_type": str(data.get("error_type") or "general")[:50].strip(),
        "description": description,
        "reference_url": str(data.get("reference_url") or "")[:200].strip(),
        "reporter_contact": str(data.get("reporter_contact") or "")[:100].strip(),
    }

    # Forward payload to webhook without logging request bodies
    try:
        req = urllib.request.Request(
            FEEDBACK_WEBHOOK_URL,
            data=json.dumps(clean_payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "User-Agent": "IHSG-Storm-Feedback/2.0"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if 200 <= response.status < 300:
                return jsonify({
                    "success": True,
                    "ticket_id": ticket_id,
                    "message": "Laporan berhasil diterima dan masuk ke antrean audit data."
                }), 201
            else:
                return jsonify({"error": "Penyedia webhook mengembalikan status non-2xx."}), 502
    except urllib.error.HTTPError:
        return jsonify({"error": "Gagal mengirimkan laporan ke penyedia webhook."}), 502
    except Exception:
        return jsonify({"error": "Koneksi ke penyedia webhook terputus."}), 502


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
