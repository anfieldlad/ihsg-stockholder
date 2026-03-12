"""
IHSG Storm - Backend Server
============================================
Flask server that serves the dashboard and proxies Yahoo Finance for live stock prices.

Usage: python server.py
"""

import json
import time
from datetime import datetime
from typing import Dict, Any, Optional, List

from flask import Flask, jsonify, send_from_directory, request, Response
from flask_cors import CORS

from api.services.yahoo import fetch_single_price, fetch_batch_prices

app = Flask(__name__, static_folder="public", static_url_path="")
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
    return send_from_directory("public", "index.html")


@app.route("/<path:filename>")
def static_files(filename: str) -> Response:
    return send_from_directory("public", filename)


# ── API routes ──

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
