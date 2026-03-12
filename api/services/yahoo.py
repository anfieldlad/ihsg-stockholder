import time
from typing import Dict, List, Optional, Any

try:
    import yfinance as yf
except ImportError:
    yf = None

def fetch_single_price(code: str) -> Dict[str, Any]:
    """Fetch price for a single stock from Yahoo Finance."""
    if not yf:
        return {"error": "yfinance not installed", "code": code}
        
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

        return {
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


def fetch_batch_prices(codes: List[str]) -> Dict[str, Dict[str, Any]]:
    """Fetch prices for multiple stocks using yfinance batch."""
    if not yf:
        return {c: {"error": "yfinance not installed", "code": c} for c in codes}

    yf_tickers_str = " ".join(f"{c}.JK" for c in codes)
    results: Dict[str, Dict[str, Any]] = {}

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

                results[code] = {
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
