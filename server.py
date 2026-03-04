"""
IHSG Stockholder Dashboard - Backend Server
============================================
Flask server that serves the dashboard and proxies Yahoo Finance for live stock prices.

Usage: python server.py
"""

import json
import time
import threading
from datetime import datetime

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS

try:
    import yfinance as yf
except ImportError:
    print("ERROR: yfinance not installed. Run: pip install yfinance")
    exit(1)


app = Flask(__name__, static_folder=".", static_url_path="")
CORS(app)

# ── In-memory cache to avoid hammering Yahoo Finance ──
price_cache = {}
CACHE_TTL = 300  # 5 minutes


def get_cached_price(code):
    """Get price from cache if still fresh."""
    if code in price_cache:
        entry = price_cache[code]
        if time.time() - entry["_fetched_at"] < CACHE_TTL:
            return entry
    return None


def fetch_single_price(code):
    """Fetch price for a single stock from Yahoo Finance."""
    yf_code = f"{code}.JK"
    try:
        ticker = yf.Ticker(yf_code)
        info = ticker.fast_info

        last_price = getattr(info, "last_price", None)
        prev_close = getattr(info, "previous_close", None)
        market_cap = getattr(info, "market_cap", None)
        volume = getattr(info, "last_volume", None)
        currency = getattr(info, "currency", "IDR")

        if last_price is not None and prev_close is not None and prev_close > 0:
            change_pct = round((last_price - prev_close) / prev_close * 100, 2)
            change_abs = round(last_price - prev_close, 2)
        else:
            change_pct = 0
            change_abs = 0

        result = {
            "code": code,
            "last_price": last_price,
            "previous_close": prev_close,
            "change_pct": change_pct,
            "change_abs": change_abs,
            "market_cap": market_cap,
            "volume": volume,
            "currency": currency or "IDR",
            "_fetched_at": time.time(),
        }

        price_cache[code] = result
        return result

    except Exception as e:
        return {
            "code": code,
            "last_price": None,
            "previous_close": None,
            "change_pct": 0,
            "change_abs": 0,
            "market_cap": None,
            "volume": None,
            "currency": "IDR",
            "error": str(e),
            "_fetched_at": time.time(),
        }


def fetch_batch_prices(codes):
    """Fetch prices for multiple stocks using yfinance batch."""
    yf_tickers_str = " ".join(f"{c}.JK" for c in codes)
    results = {}

    try:
        tickers = yf.Tickers(yf_tickers_str)

        for code in codes:
            yf_code = f"{code}.JK"
            try:
                ticker = tickers.tickers.get(yf_code)
                if ticker is None:
                    results[code] = {
                        "code": code, "last_price": None, "previous_close": None,
                        "change_pct": 0, "change_abs": 0, "market_cap": None,
                        "volume": None, "currency": "IDR", "error": "not_found",
                        "_fetched_at": time.time(),
                    }
                    continue

                info = ticker.fast_info
                last_price = getattr(info, "last_price", None)
                prev_close = getattr(info, "previous_close", None)
                market_cap = getattr(info, "market_cap", None)
                volume = getattr(info, "last_volume", None)
                currency = getattr(info, "currency", "IDR")

                if last_price and prev_close and prev_close > 0:
                    change_pct = round((last_price - prev_close) / prev_close * 100, 2)
                    change_abs = round(last_price - prev_close, 2)
                else:
                    change_pct = 0
                    change_abs = 0

                result = {
                    "code": code,
                    "last_price": last_price,
                    "previous_close": prev_close,
                    "change_pct": change_pct,
                    "change_abs": change_abs,
                    "market_cap": market_cap,
                    "volume": volume,
                    "currency": currency or "IDR",
                    "_fetched_at": time.time(),
                }
                results[code] = result
                price_cache[code] = result

            except Exception as e:
                results[code] = {
                    "code": code, "last_price": None, "previous_close": None,
                    "change_pct": 0, "change_abs": 0, "market_cap": None,
                    "volume": None, "currency": "IDR", "error": str(e),
                    "_fetched_at": time.time(),
                }
    except Exception as e:
        for code in codes:
            if code not in results:
                results[code] = {
                    "code": code, "last_price": None, "previous_close": None,
                    "change_pct": 0, "change_abs": 0, "market_cap": None,
                    "volume": None, "currency": "IDR", "error": f"batch_error: {e}",
                    "_fetched_at": time.time(),
                }

    return results


# ── Static file routes ──

@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(".", filename)


# ── API routes ──

@app.route("/api/price/<code>")
def get_price(code):
    """Get live price for a single stock."""
    code = code.upper()
    cached = get_cached_price(code)
    if cached:
        result = {k: v for k, v in cached.items() if not k.startswith("_")}
        result["cached"] = True
        return jsonify(result)

    result = fetch_single_price(code)
    clean = {k: v for k, v in result.items() if not k.startswith("_")}
    clean["cached"] = False
    return jsonify(clean)


@app.route("/api/prices")
def get_prices():
    """
    Get live prices for multiple stocks.
    Query param: codes=BBCA,BBRI,TLKM (comma-separated, max 50)
    """
    codes_param = request.args.get("codes", "")
    if not codes_param:
        return jsonify({"error": "Missing 'codes' query parameter"}), 400

    codes = [c.strip().upper() for c in codes_param.split(",") if c.strip()]
    if len(codes) > 50:
        codes = codes[:50]

    # Check cache first
    to_fetch = []
    results = {}
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
            clean = {k: v for k, v in data.items() if not k.startswith("_")}
            clean["cached"] = False
            results[code] = clean

    return jsonify({
        "prices": results,
        "fetched_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "count": len(results),
    })


@app.route("/api/cache/clear")
def clear_cache():
    """Clear the price cache."""
    price_cache.clear()
    return jsonify({"message": "Cache cleared", "timestamp": datetime.now().isoformat()})


@app.route("/api/cache/stats")
def cache_stats():
    """Get cache statistics."""
    now = time.time()
    active = sum(1 for v in price_cache.values() if now - v["_fetched_at"] < CACHE_TTL)
    return jsonify({
        "total_entries": len(price_cache),
        "active_entries": active,
        "ttl_seconds": CACHE_TTL,
    })


if __name__ == "__main__":
    print("=" * 50)
    print("  IHSG Stockholder Dashboard Server")
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
