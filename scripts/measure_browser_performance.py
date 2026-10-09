#!/usr/bin/env python3
"""scripts/measure_browser_performance.py — Measure mobile CWV and hydration for SEO spike.

Executes Section 10 items 6 & 7 of seo-technical-options.md:
- Starts local http server serving dist-spike/ (and public/ for baseline)
- Uses Playwright headless Chromium (1 browser at a time, mobile viewport 375x812)
- Tests no-JS readability (HTML renders tables, lock cards, metadata without JS)
- Tests JS hydration (verifies zero duplicate tables, single lock card, zero errors)
- Measures Mobile Web Vitals: LCP, CLS, TBT, FCP, TTFB
"""
import functools
import http.server
import json
import os
import socket
import sys
import threading
import time
from pathlib import Path

# Playwright configuration
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/home/hermes/tools/browser/cache"
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_SPIKE = REPO_ROOT / "dist-spike"
PUBLIC_DIR = REPO_ROOT / "public"


def find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class QuietHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress server request logging


def start_server(directory: Path, port: int):
    handler = functools.partial(QuietHTTPHandler, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


WEB_VITALS_INIT_SCRIPT = """
window.__webVitals = { lcp: 0, cls: 0, tbt: 0, fcp: 0, longTasks: 0 };
try {
  let cls = 0;
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (!entry.hadRecentInput) {
        cls += entry.value;
      }
    }
    window.__webVitals.cls = cls;
  }).observe({ type: 'layout-shift', buffered: true });
} catch (e) {}

try {
  new PerformanceObserver((entryList) => {
    const entries = entryList.getEntries();
    if (entries.length > 0) {
      window.__webVitals.lcp = entries[entries.length - 1].startTime;
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });
} catch (e) {}

try {
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        window.__webVitals.fcp = entry.startTime;
      }
    }
  }).observe({ type: 'paint', buffered: true });
} catch (e) {}

try {
  let tbt = 0;
  new PerformanceObserver((entryList) => {
    for (const entry of entryList.getEntries()) {
      window.__webVitals.longTasks += 1;
      if (entry.duration > 50) {
        tbt += (entry.duration - 50);
      }
    }
    window.__webVitals.tbt = tbt;
  }).observe({ type: 'longtask', buffered: true });
} catch (e) {}
"""


def test_page_no_js(browser, base_url: str, path: str) -> dict:
    """Test that static pre-rendered HTML is completely readable with JS disabled."""
    context = browser.new_context(
        java_script_enabled=False,
        viewport={"width": 375, "height": 812},
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    )
    page = context.new_page()
    target_url = f"{base_url}{path}"
    page.goto(target_url, wait_until="load")

    h1_text = page.locator("h1").inner_text() if page.locator("h1").count() > 0 else ""
    table_count = page.locator("table").count()
    row_count = page.locator("tbody tr").count()
    lock_card_count = page.locator(".lock-card").count()
    lock_card_text = page.locator(".lock-card").inner_text() if lock_card_count > 0 else ""
    disclaimer_count = page.locator("footer:has-text('KSEI')").count()

    context.close()
    return {
        "url": target_url,
        "js_enabled": False,
        "h1": h1_text,
        "table_count": table_count,
        "row_count": row_count,
        "lock_card_count": lock_card_count,
        "lock_card_text": lock_card_text.strip().replace("\n", " ")[:80],
        "has_disclaimer": disclaimer_count > 0,
        "readable": bool(h1_text and table_count == 1 and row_count > 0),
    }


def test_page_with_js_and_metrics(browser, base_url: str, path: str) -> dict:
    """Test mobile performance metrics (LCP, CLS, TBT) and hydration integrity."""
    context = browser.new_context(
        java_script_enabled=True,
        viewport={"width": 375, "height": 812},
        is_mobile=True,
        has_touch=True,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148",
    )
    page = context.new_page()
    page.add_init_script(WEB_VITALS_INIT_SCRIPT)

    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

    target_url = f"{base_url}{path}"
    t0 = time.time()
    page.goto(target_url, wait_until="load")
    page.wait_for_timeout(800)  # Settle layout shifts and hydration
    load_duration = (time.time() - t0) * 1000

    # Hydration integrity checks
    table_count = page.locator("table").count()
    row_count = page.locator("tbody tr").count()
    lock_card_count = page.locator(".lock-card").count()

    # Collect Web Vitals metrics
    vitals = page.evaluate("window.__webVitals || {}")
    timing = page.evaluate("""() => {
      const nav = performance.getEntriesByType('navigation')[0] || {};
      return {
        ttfb: nav.responseStart - nav.requestStart || 0,
        domInteractive: nav.domInteractive || 0,
        domComplete: nav.domComplete || 0
      };
    }""")

    context.close()
    return {
        "url": target_url,
        "js_enabled": True,
        "load_duration_ms": round(load_duration, 1),
        "table_count": table_count,
        "row_count": row_count,
        "lock_card_count": lock_card_count,
        "no_duplicate_table": table_count == 1,
        "single_lock_card": lock_card_count == 1,
        "console_errors_count": len(console_errors),
        "console_errors": console_errors,
        "metrics": {
            "lcp_ms": round(vitals.get("lcp", 0.0), 1),
            "cls": round(vitals.get("cls", 0.0), 4),
            "tbt_ms": round(vitals.get("tbt", 0.0), 1),
            "fcp_ms": round(vitals.get("fcp", 0.0), 1),
            "ttfb_ms": round(timing.get("ttfb", 0.0), 1),
        },
    }


def main():
    print("[1/5] Starting local servers...")
    port_spike = find_free_port()
    server_spike = start_server(DIST_SPIKE, port_spike)
    base_spike = f"http://127.0.0.1:{port_spike}"

    port_home = find_free_port()
    server_home = start_server(PUBLIC_DIR, port_home)
    base_home = f"http://127.0.0.1:{port_home}"

    print(f"  - dist-spike/ running on {base_spike}")
    print(f"  - public/ (homepage) running on {base_home}")

    try:
        with sync_playwright() as p:
            print("[2/5] Launching single headless Chromium instance...")
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
            )

            # Test A: No-JS readability on stock page
            print("[3/5] Testing static readability with JavaScript DISABLED...")
            no_js_bbca = test_page_no_js(browser, base_spike, "/saham/bbca/")
            no_js_aadi = test_page_no_js(browser, base_spike, "/saham/aadi/")
            no_js_investor = test_page_no_js(browser, base_spike, "/investor/gesit-perkasa/")

            print(f"  /saham/bbca/ (no JS, <=5 holders): table_count={no_js_bbca['table_count']}, rows={no_js_bbca['row_count']}, lock={no_js_bbca['lock_card_count']}, readable={no_js_bbca['readable']}")
            print(f"  /saham/aadi/ (no JS, >5 holders): table_count={no_js_aadi['table_count']}, rows={no_js_aadi['row_count']}, lock={no_js_aadi['lock_card_count']}, readable={no_js_aadi['readable']}")
            print(f"  /investor/gesit-perkasa/ (no JS): table_count={no_js_investor['table_count']}, rows={no_js_investor['row_count']}, readable={no_js_investor['readable']}")

            # Test B: JS hydration and Web Vitals on stock page & investor page
            print("[4/5] Testing JS activation, hydration integrity, and Web Vitals...")
            js_bbca = test_page_with_js_and_metrics(browser, base_spike, "/saham/bbca/")
            js_aadi = test_page_with_js_and_metrics(browser, base_spike, "/saham/aadi/")
            js_inv = test_page_with_js_and_metrics(browser, base_spike, "/investor/gesit-perkasa/")

            # Test C: Baseline homepage for comparison
            print("[5/5] Measuring baseline homepage for comparison...")
            home_metrics = test_page_with_js_and_metrics(browser, base_home, "/")

            browser.close()

        # Output Results
        print("\n=================== BROWSER TEST RESULTS ===================")
        print("--- 1. NO-JS READABILITY ---")
        print(f"  BBCA Stock Page  : {'PASS' if no_js_bbca['readable'] else 'FAIL'} (H1: {no_js_bbca['h1']}, {no_js_bbca['row_count']} rows, Lock Card: {no_js_bbca['lock_card_text']})")
        print(f"  Investor Page    : {'PASS' if no_js_investor['readable'] else 'FAIL'} (H1: {no_js_investor['h1']}, {no_js_investor['row_count']} rows)")

        print("\n--- 2. HYDRATION INTEGRITY ---")
        print(f"  BBCA No Duplicate Table : {'PASS' if js_bbca['no_duplicate_table'] else 'FAIL'} (tables={js_bbca['table_count']})")
        print(f"  AADI No Duplicate Table : {'PASS' if js_aadi['no_duplicate_table'] else 'FAIL'} (tables={js_aadi['table_count']})")
        print(f"  AADI Single Lock Card   : {'PASS' if js_aadi['single_lock_card'] else 'FAIL'} (cards={js_aadi['lock_card_count']})")
        print(f"  Console Errors (BBCA)   : {js_bbca['console_errors_count']}")
        print(f"  Console Errors (AADI)   : {js_aadi['console_errors_count']}")

        print("\n--- 3. MOBILE CORE WEB VITALS COMPARISON (375x812) ---")
        print(f"{'Metric':<16} | {'Homepage (SPA)':<16} | {'BBCA (Static SEO)':<18} | {'AADI (Static SEO)':<18}")
        print("-" * 75)
        print(f"{'LCP (ms)':<16} | {home_metrics['metrics']['lcp_ms']:<16} | {js_bbca['metrics']['lcp_ms']:<18} | {js_aadi['metrics']['lcp_ms']:<18}")
        print(f"{'CLS score':<16} | {home_metrics['metrics']['cls']:<16} | {js_bbca['metrics']['cls']:<18} | {js_aadi['metrics']['cls']:<18}")
        print(f"{'TBT (ms)':<16} | {home_metrics['metrics']['tbt_ms']:<16} | {js_bbca['metrics']['tbt_ms']:<18} | {js_aadi['metrics']['tbt_ms']:<18}")
        print(f"{'FCP (ms)':<16} | {home_metrics['metrics']['fcp_ms']:<16} | {js_bbca['metrics']['fcp_ms']:<18} | {js_aadi['metrics']['fcp_ms']:<18}")
        print(f"{'TTFB (ms)':<16} | {home_metrics['metrics']['ttfb_ms']:<16} | {js_bbca['metrics']['ttfb_ms']:<18} | {js_aadi['metrics']['ttfb_ms']:<18}")

        # Save results to json for report inclusion
        report_data = {
            "no_js_bbca": no_js_bbca,
            "no_js_aadi": no_js_aadi,
            "no_js_investor": no_js_investor,
            "js_bbca": js_bbca,
            "js_aadi": js_aadi,
            "js_inv": js_inv,
            "homepage": home_metrics,
        }
        (REPO_ROOT / "dist-spike" / "browser_metrics.json").write_text(json.dumps(report_data, indent=2), encoding="utf-8")
        print("\n[SUCCESS] Browser performance and hydration metrics saved to dist-spike/browser_metrics.json.")

    finally:
        server_spike.shutdown()
        server_home.shutdown()


if __name__ == "__main__":
    main()
