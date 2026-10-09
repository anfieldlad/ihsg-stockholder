#!/usr/bin/env python3
"""
tests/test_browser_e2e.py - Playwright Chromium E2E Browser Test Suite (M0-6)
Runs on GitHub runner in CI (and locally if Playwright is available).

Requirements from architecture-v3.md M0-6:
  - Load index.html from a local static server
  - Assert >=1 stock row rendered in #stockList
  - Assert #app-fallback is hidden
  - Assert zero console errors
  - Assert a stock modal opens upon clicking a stock row
"""

import asyncio
import http.server
import json
import os
from pathlib import Path
import socketserver
import sys
import threading

REPO_ROOT = Path(__file__).resolve().parent.parent

# Support local Playwright browser cache on VPS if present
if os.path.exists("/home/hermes/tools/browser/cache"):
    os.environ.setdefault("PLAYWRIGHT_BROWSERS_PATH", "/home/hermes/tools/browser/cache")


def load_csp_header():
    """Extract Content-Security-Policy header from vercel.json or deploy/headers.json."""
    headers_file = REPO_ROOT / "deploy" / "headers.json"
    if headers_file.exists():
        try:
            with open(headers_file, "r", encoding="utf-8") as f:
                for h in json.load(f):
                    if h.get("key") == "Content-Security-Policy":
                        return h.get("value")
        except Exception:
            pass

    vercel_file = REPO_ROOT / "vercel.json"
    if vercel_file.exists():
        try:
            with open(vercel_file, "r", encoding="utf-8") as f:
                vj = json.load(f)
                for entry in vj.get("headers", []):
                    for h in entry.get("headers", []):
                        if h.get("key") == "Content-Security-Policy":
                            return h.get("value")
        except Exception:
            pass

    return "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';"


class LocalE2EHandler(http.server.SimpleHTTPRequestHandler):
    """Static HTTP handler mocking backend API endpoints and setting CSP."""

    def __init__(self, *args, **kwargs):
        serve_dir = REPO_ROOT / "public" if (REPO_ROOT / "public").exists() else REPO_ROOT
        super().__init__(*args, directory=str(serve_dir), **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/feedback/status"):
            payload = json.dumps({"available": False}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        elif self.path.startswith("/api/prices"):
            payload = json.dumps({"prices": {}, "updated": "2026-10-08"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        elif self.path.startswith("/api/price/"):
            code = self.path.split("/")[-1].split("?")[0]
            payload = json.dumps({"code": code, "price": 1000, "change_pct": 0.0}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
            return
        super().do_GET()

    def end_headers(self):
        csp = load_csp_header()
        if csp:
            self.send_header("Content-Security-Policy", csp)
        super().end_headers()

    def log_message(self, format, *args):
        # Suppress noisy HTTP request logging in test output
        pass


def run_e2e_test():
    """Main E2E test runner."""
    server = socketserver.TCPServer(("127.0.0.1", 0), LocalE2EHandler)
    port = server.server_address[1]
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"[browser-e2e] Local static server started on http://127.0.0.1:{port}/")

    async def run_playwright():
        from playwright.async_api import async_playwright

        console_errors = []
        page_errors = []

        async with async_playwright() as p:
            print("[browser-e2e] Launching Playwright Chromium headless...")
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(viewport={"width": 1280, "height": 800})
            page = await context.new_page()

            def on_console(msg):
                if msg.type == "error":
                    console_errors.append(f"[{msg.type}] {msg.text}")

            def on_page_error(err):
                page_errors.append(str(err))

            page.on("console", on_console)
            page.on("pageerror", on_page_error)

            url = f"http://127.0.0.1:{port}/"
            print(f"[browser-e2e] Navigating to {url} ...")
            await page.goto(url, wait_until="networkidle")

            # 1. Assert title is present
            title = await page.title()
            print(f"[browser-e2e] Page loaded: title='{title}'")
            assert "IHSG" in title, f"Unexpected page title: {title}"

            # 2. Wait past the 3s fallback timer to verify store initialization hides fallback
            print("[browser-e2e] Waiting for store initialization and rendering...")
            await page.wait_for_selector("#stockList button.row", timeout=10000)
            await asyncio.sleep(3.5)

            # 3. Assert #app-fallback is hidden
            fallback_visible = await page.is_visible("#app-fallback")
            print(f"[browser-e2e] #app-fallback visible: {fallback_visible}")
            assert not fallback_visible, "FATAL: #app-fallback is visible! Page failed to initialize store."

            # 4. Assert >= 1 stock row rendered
            stock_rows = await page.query_selector_all("#stockList button.row")
            print(f"[browser-e2e] Stock rows rendered: {len(stock_rows)}")
            assert len(stock_rows) >= 1, f"Expected >= 1 stock rows in #stockList, got {len(stock_rows)}"

            # 5. Assert zero console errors and zero page errors
            print(f"[browser-e2e] Console errors count: {len(console_errors)}")
            if console_errors:
                for ce in console_errors:
                    print(f"  [ERROR] {ce}")
            assert len(console_errors) == 0, f"Detected console errors: {console_errors}"

            print(f"[browser-e2e] Page errors count: {len(page_errors)}")
            if page_errors:
                for pe in page_errors:
                    print(f"  [PAGE ERROR] {pe}")
            assert len(page_errors) == 0, f"Detected page errors: {page_errors}"

            # 6. Test opening a stock modal / detail pane
            print("[browser-e2e] Clicking first stock row to open stock detail...")
            await stock_rows[0].click()
            await asyncio.sleep(0.5)

            # Detail opens either in desktop #pane or in mobile #sheet
            detail_selector = "#pane .big, #sheet.on .big"
            await page.wait_for_selector(detail_selector, timeout=5000)
            detail_element = await page.query_selector(detail_selector)
            assert detail_element is not None, "Stock detail container was not found"
            detail_code = await detail_element.inner_text()
            print(f"[browser-e2e] Stock modal/detail opened successfully with code: '{detail_code.strip()}'")
            assert len(detail_code.strip()) > 0, "Stock detail modal/pane opened but stock code is empty"
            await page.close()

            # 7. Test Mobile viewport bottom sheet modal
            print("[browser-e2e] Testing mobile viewport (375x667) bottom sheet modal...")
            mobile_page = await context.new_page()
            await mobile_page.set_viewport_size({"width": 375, "height": 667})
            mobile_page.on("console", on_console)
            mobile_page.on("pageerror", on_page_error)
            await mobile_page.goto(url, wait_until="networkidle")
            await mobile_page.wait_for_selector("#stockList button.row", timeout=15000)
            mobile_rows = await mobile_page.query_selector_all("#stockList button.row")
            assert len(mobile_rows) >= 1, "Mobile view: No stock rows rendered"
            await mobile_rows[0].click()
            await asyncio.sleep(0.5)

            sheet_on = await mobile_page.is_visible("#sheet.on")
            print(f"[browser-e2e] Mobile #sheet.on visible: {sheet_on}")
            assert sheet_on, "Mobile bottom sheet dialog (#sheet.on) failed to open on stock click"

            await mobile_page.close()
            await browser.close()
            print("\n[browser-e2e PASS] All browser E2E assertions passed successfully!")

    try:
        asyncio.run(run_playwright())
    finally:
        server.shutdown()


def test_browser_e2e_playwright():
    """Pytest test wrapper; skips if Playwright is not installed."""
    try:
        import playwright
    except ImportError:
        import pytest
        pytest.skip("Playwright not installed in this environment")
    run_e2e_test()


if __name__ == "__main__":
    run_e2e_test()
