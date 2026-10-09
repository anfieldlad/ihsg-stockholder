"""
tests/test_umami_live.py - Umami Analytics Playwright Network & Privacy Verification

Verifies:
1. Normal user (DNT=0):
   - Exactly one script request to cloud.umami.is/script.js
   - Script element injected with data-website-id and data-auto-track=false
   - 100% Cookieless: document.cookie is empty (""), context.cookies() is empty ([])
   - Tab switching does NOT trigger extra script requests
2. DNT user (DNT=1):
   - Exactly ZERO requests to cloud.umami.is
   - No script injected
3. Adblock simulation (cloud.umami.is aborted):
   - Page loads cleanly with 0 console errors from application code
   - Stock list renders normally
"""

import functools
import http.server
import json
import os
from pathlib import Path
import socket
import threading
import time

os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/home/hermes/tools/browser/cache"
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"


def find_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_GET(self):
        if self.path.startswith("/api/prices"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"prices":{}}')
            return
        if self.path.startswith("/api/feedback/status"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"available":false}')
            return
        return super().do_GET()


def start_server(port: int):
    handler = functools.partial(QuietHandler, directory=str(PUBLIC_DIR))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def run_tests():
    port = find_free_port()
    server = start_server(port)
    base_url = f"http://127.0.0.1:{port}"
    print(f"[TEST SERVER] Serving {PUBLIC_DIR} on {base_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])

        # -------------------------------------------------------------
        # SCENARIO 1: Normal user (DNT not set)
        # -------------------------------------------------------------
        print("\n--- SCENARIO 1: Normal user (Umami activation & Cookieless proof) ---")
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        script_requests = []
        all_requests = []

        page.on("request", lambda req: all_requests.append(req.url))
        page.on("request", lambda req: script_requests.append(req.url) if "cloud.umami.is" in req.url else None)
        page.on("console", lambda m: print(f"[CONSOLE {m.type}] {m.text}"))
        page.on("pageerror", lambda e: print(f"[PAGE ERROR] {e}"))

        # Mock cloud.umami.is/script.js response so external network call succeeds deterministically
        page.route("https://cloud.umami.is/script.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="window.umami = { track: function(n, d) { window.__umami_events = window.__umami_events || []; window.__umami_events.push({name:n, data:d}); } };"
        ))

        page.goto(f"{base_url}/index.html", wait_until="networkidle")
        page.wait_for_selector("#v-stocks .row", timeout=15000)

        # 1. Exactly one script request made
        print(f"Total requests to cloud.umami.is: {len(script_requests)}")
        print(f"Request URLs: {script_requests}")
        assert len(script_requests) == 1, f"Expected exactly 1 request to cloud.umami.is, got {len(script_requests)}"
        assert "cloud.umami.is/script.js" in script_requests[0], f"Unexpected script URL: {script_requests[0]}"
        print("[PASS] Exactly one script request to cloud.umami.is/script.js verified!")

        # 2. Check injected script element attributes
        script_info = page.evaluate("""() => {
            const el = document.querySelector('script[src*="cloud.umami.is"]');
            if (!el) return null;
            return {
                websiteId: el.getAttribute('data-website-id'),
                autoTrack: el.getAttribute('data-auto-track'),
                doNotTrack: el.getAttribute('data-do-not-track'),
                defer: el.defer
            };
        }""")
        print("Injected script attributes:", script_info)
        assert script_info is not None, "Script element must be present in document"
        assert script_info["websiteId"] == "010bf3dc-512c-49e6-977a-11bf3a265b1b", f"Unexpected websiteId: {script_info['websiteId']}"
        assert script_info["autoTrack"] == "false", "autoTrack must be 'false' to avoid history change event explosion"
        assert script_info["defer"] is True, "Script must have defer=true"
        print("[PASS] Script tag attributes verified: websiteId set, autoTrack=false, defer=true!")

        # 3. 100% Cookieless verification
        doc_cookie = page.evaluate("document.cookie")
        ctx_cookies = context.cookies()
        print(f"document.cookie: '{doc_cookie}'")
        print(f"context.cookies(): {ctx_cookies}")
        assert doc_cookie == "", f"document.cookie must be empty, got: {doc_cookie}"
        assert len(ctx_cookies) == 0, f"context.cookies() must be empty list, got: {ctx_cookies}"
        print("[PASS] 100% Cookieless verified! No cookies set anywhere.")

        # 4. Tab switching must NOT fire extra script requests
        page.locator(".rail button:has-text('Investor')").click()
        page.wait_for_timeout(300)
        page.locator(".rail button:has-text('Analitik')").click()
        page.wait_for_timeout(300)
        page.locator(".rail button:has-text('Bantuan')").click()
        page.wait_for_timeout(300)
        page.locator(".rail button:has-text('Saham')").click()
        page.wait_for_timeout(300)
        assert len(script_requests) == 1, f"Expected still exactly 1 script request after tab switches, got {len(script_requests)}"
        print("[PASS] Tab switching does NOT trigger extra script requests!")

        page.close()
        context.close()

        # -------------------------------------------------------------
        # SCENARIO 2: Do-Not-Track user (DNT=1)
        # -------------------------------------------------------------
        print("\n--- SCENARIO 2: Do-Not-Track (DNT=1) user ---")
        dnt_context = browser.new_context(
            viewport={"width": 1280, "height": 800},
            extra_http_headers={"DNT": "1"}
        )
        dnt_page = dnt_context.new_page()

        # Also set navigator.doNotTrack = '1' in browser window
        dnt_page.add_init_script("Object.defineProperty(navigator, 'doNotTrack', { get: () => '1' });")

        dnt_script_requests = []
        dnt_page.on("request", lambda req: dnt_script_requests.append(req.url) if "cloud.umami.is" in req.url else None)

        dnt_page.goto(f"{base_url}/index.html", wait_until="networkidle")
        dnt_page.wait_for_selector("#v-stocks .row", timeout=15000)

        print(f"Requests to cloud.umami.is under DNT=1: {len(dnt_script_requests)}")
        assert len(dnt_script_requests) == 0, f"DNT=1 must make ZERO requests to cloud.umami.is, got: {dnt_script_requests}"

        dnt_script_el = dnt_page.evaluate("document.querySelector('script[src*=\"cloud.umami.is\"]')")
        assert dnt_script_el is None, "No Umami script tag must be injected when DNT=1"
        print("[PASS] DNT=1 honored! Exactly 0 requests made and no script tag injected.")

        dnt_page.close()
        dnt_context.close()

        # -------------------------------------------------------------
        # SCENARIO 3: AdBlock simulation (cloud.umami.is aborted)
        # -------------------------------------------------------------
        print("\n--- SCENARIO 3: AdBlock simulation (route abort) ---")
        ab_context = browser.new_context(viewport={"width": 1280, "height": 800})
        ab_page = ab_context.new_page()

        console_errors = []
        ab_page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)

        ab_page.route("**/cloud.umami.is/**", lambda route: route.abort("blockedbyclient"))

        ab_page.goto(f"{base_url}/index.html", wait_until="networkidle")
        ab_page.wait_for_selector("#v-stocks .row", timeout=15000)

        stock_count = ab_page.locator("#v-stocks .row").count()
        assert stock_count >= 30, f"Expected >= 30 stock rows, got {stock_count}"

        # Ensure no application errors thrown by our code
        app_errors = [e for e in console_errors if "net::ERR_BLOCKED_BY_CLIENT" not in e and "cloud.umami.is" not in e]
        print("Application console errors during AdBlock:", app_errors)
        assert len(app_errors) == 0, f"Expected 0 app console errors under AdBlock, got: {app_errors}"
        print("[PASS] AdBlock resilience verified: app boots cleanly with zero delays or errors!")

        ab_page.close()
        ab_context.close()

        browser.close()

    server.shutdown()
    print("\n===============================================================")
    print("[ALL UMAMI ANALYTICS PLAYWRIGHT TESTS PASSED 100%]")
    print("===============================================================")


if __name__ == "__main__":
    run_tests()
