"""
tests/test_loading_state.py - Regression Test Suite for IHSG Loading State (t_34cbcea8)

Verifies:
1. On Slow 3G (CDP throttling), 'Gagal memuat' NEVER appears while downloading.
2. Loading panel is visible at t=1s, 3s, 8s (with 8s progress hint).
3. After data arrives, table renders with 0 console errors.
4. On Fast 3G, page loads smoothly with 0 console errors.
5. Error DOES appear and 'Coba Lagi' works when /shareholder_data.json is blocked.
6. Error DOES appear with script error copy when module import is broken.
7. Mobile 375px responsive check.
8. Saves screenshots under /home/hermes/company/ihsg/shots/loading/.
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

# Ensure PLAYWRIGHT_BROWSERS_PATH is set
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/home/hermes/tools/browser/cache"
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"
SHOTS_DIR = Path("/home/hermes/company/ihsg/shots/loading")
SHOTS_DIR.mkdir(parents=True, exist_ok=True)


def find_free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress request spam

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
        # Print path for debug if it doesn't exist
        full_path = PUBLIC_DIR / self.path.lstrip("/")
        if not full_path.exists() and not self.path.startswith("/api"):
            print(f"[404 NOT FOUND]: {self.path}")
        return super().do_GET()


def start_server(port: int):
    handler = functools.partial(QuietHandler, directory=str(PUBLIC_DIR))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def run_tests():
    port = find_free_port()
    server = start_server(port)
    base_url = f"http://127.0.0.1:{port}"
    print(f"[TEST SERVER] Serving {PUBLIC_DIR} on {base_url}")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])
        context = browser.new_context(viewport={"width": 1280, "height": 800})

        # -------------------------------------------------------------
        # TEST 1: Slow 3G Emulation & Loading Timeline (t=1s, 3s, 8s)
        # -------------------------------------------------------------
        print("\n--- TEST 1: Slow 3G Emulation & Loading Timeline ---")
        page = context.new_page()
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # Emulate Slow 3G via CDP: 400ms latency, 400 kbps download (~50 KB/s)
        cdp = context.new_cdp_session(page)
        cdp.send("Network.emulateNetworkConditions", {
            "offline": False,
            "latency": 400,
            "downloadThroughput": 50 * 1024,
            "uploadThroughput": 50 * 1024,
            "connectionType": "cellular3g"
        })

        start_time = time.time()
        page.goto(f"{base_url}/index.html")

        # t = 1s check
        page.wait_for_timeout(1000)
        elapsed = time.time() - start_time
        print(f"[t={elapsed:.1f}s] Checking loading state...")
        print("Body text snippet:", repr(page.locator("body").inner_text()[:100]))
        print("#app-loading visible?", page.locator("#app-loading").is_visible())
        assert page.locator("#app-loading").is_visible(), "Loading panel #app-loading must be visible at t=1s"
        assert not page.locator("#app-fallback").is_visible(), "#app-fallback must NOT be visible at t=1s"
        page_text = page.locator("body").inner_text()
        assert "Gagal memuat" not in page_text, "'Gagal memuat' must NOT appear at t=1s"

        # t = 3s check
        page.wait_for_timeout(2000)
        elapsed = time.time() - start_time
        print(f"[t={elapsed:.1f}s] Checking loading state (the old false-error 3s mark)...")
        assert page.locator("#app-loading").is_visible(), "Loading panel #app-loading must be visible at t=3s"
        assert not page.locator("#app-fallback").is_visible(), "#app-fallback must NOT be visible at t=3s"
        page_text = page.locator("body").inner_text()
        assert "Gagal memuat" not in page_text, "'Gagal memuat' must NEVER appear at t=3s"
        page.screenshot(path=str(SHOTS_DIR / "loading_3s.png"))
        print(f"[PASS] t=3s verified! False error did not flash. Screenshot saved to {SHOTS_DIR / 'loading_3s.png'}")

        # t = 8.5s check (progress hint should appear)
        page.wait_for_timeout(5500)
        elapsed = time.time() - start_time
        print(f"[t={elapsed:.1f}s] Checking progress hint (>8s)...")
        assert page.locator("#app-loading").is_visible(), "Loading panel #app-loading must still be visible at t=8s"
        assert page.locator("#app-loading-hint").is_visible(), "Progress hint #app-loading-hint must appear after 8s"
        hint_text = page.locator("#app-loading-hint").inner_text()
        assert "Koneksi lambat, masih memuat..." in hint_text, f"Expected hint text, got '{hint_text}'"
        assert not page.locator("#app-fallback").is_visible(), "#app-fallback must NOT be visible at t=8s"
        page.screenshot(path=str(SHOTS_DIR / "loading_8s_hint.png"))
        print(f"[PASS] t=8s verified! Progress hint is visible. Screenshot saved to {SHOTS_DIR / 'loading_8s_hint.png'}")

        # Now remove network throttling so data download finishes quickly for table render verification
        cdp.send("Network.emulateNetworkConditions", {
            "offline": False,
            "latency": 0,
            "downloadThroughput": -1,
            "uploadThroughput": -1
        })

        # Wait for data arrival (t ~ 12s)
        print("Waiting for data download to finish and table to render...")
        page.wait_for_selector("#v-stocks .row", timeout=20000)
        assert not page.locator("#app-loading").is_visible(), "#app-loading must be hidden after boot"
        assert not page.locator("#app-fallback").is_visible(), "#app-fallback must be hidden after boot"
        stock_count = page.locator("#v-stocks .row").count()
        print(f"[PASS] Data arrived and table rendered! Visible rows: {stock_count}")
        assert stock_count >= 30, f"Expected at least 30 stock rows, got {stock_count}"
        page.screenshot(path=str(SHOTS_DIR / "rendered_after_data.png"))

        # Verify 0 console errors
        print(f"Console errors: {console_errors}")
        assert len(console_errors) == 0, f"Expected 0 console errors, got {console_errors}"
        print("[PASS] TEST 1 PASSED WITH 0 CONSOLE ERRORS!\n")
        page.close()

        # -------------------------------------------------------------
        # TEST 2: Fast 3G Emulation
        # -------------------------------------------------------------
        print("--- TEST 2: Fast 3G Emulation ---")
        page = context.new_page()
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        cdp = context.new_cdp_session(page)
        cdp.send("Network.emulateNetworkConditions", {
            "offline": False,
            "latency": 150,
            "downloadThroughput": int(1.6 * 1024 * 1024 / 8),
            "uploadThroughput": int(750 * 1024 / 8),
            "connectionType": "cellular3g"
        })

        page.goto(f"{base_url}/index.html", wait_until="networkidle")
        page.wait_for_selector("#v-stocks .row", timeout=15000)
        assert not page.locator("#app-loading").is_visible()
        assert not page.locator("#app-fallback").is_visible()
        assert page.locator("#v-stocks .row").count() >= 30
        assert len(console_errors) == 0, f"Fast 3G console errors: {console_errors}"
        print("[PASS] TEST 2 PASSED: Fast 3G loaded cleanly with 0 console errors!\n")
        page.close()

        # -------------------------------------------------------------
        # TEST 3: Blocked /shareholder_data.json Route Abort & Coba Lagi
        # -------------------------------------------------------------
        print("--- TEST 3: Blocked shareholder_data.json Route Abort & Coba Lagi ---")
        page = context.new_page()

        # Abort shareholder_data.json requests
        page.route("**/shareholder_data.json", lambda route: route.abort("failed"))
        page.goto(f"{base_url}/index.html")

        # Fallback error container must appear
        page.wait_for_selector("#app-fallback", state="visible", timeout=10000)
        assert not page.locator("#app-loading").is_visible(), "#app-loading must be hidden when error occurs"
        error_msg = page.locator("#app-fallback-msg").inner_text()
        print(f"Fallback error message displayed: '{error_msg}'")
        assert "Gagal memuat data kepemilikan saham" in error_msg, f"Expected network error copy, got '{error_msg}'"
        assert page.locator("#app-fallback-retry").is_visible(), "Coba Lagi button must be visible"
        page.screenshot(path=str(SHOTS_DIR / "error_data_blocked.png"))
        print(f"[PASS] Error displayed correctly. Screenshot saved to {SHOTS_DIR / 'error_data_blocked.png'}")

        # Now test 'Coba Lagi' works when unblocked
        print("Testing 'Coba Lagi' retry recovery...")
        page.unroute("**/shareholder_data.json")
        page.locator("#app-fallback-retry").click()
        page.wait_for_selector("#v-stocks .row", timeout=15000)
        assert not page.locator("#app-fallback").is_visible()
        assert page.locator("#v-stocks .row").count() >= 30
        print("[PASS] TEST 3 PASSED: Error shown on data failure, and 'Coba Lagi' recovered cleanly!\n")
        page.close()

        # -------------------------------------------------------------
        # TEST 4: Broken Module Import Error
        # -------------------------------------------------------------
        print("--- TEST 4: Broken Module Import Error ---")
        page = context.new_page()

        # Route store.js to broken syntax
        page.route("**/src/store.js", lambda route: route.fulfill(
            status=200,
            content_type="application/javascript",
            body="import { nonexistent } from './broken_nonexistent_module.js';"
        ))

        page.goto(f"{base_url}/index.html")
        page.wait_for_selector("#app-fallback", state="visible", timeout=10000)
        assert not page.locator("#app-loading").is_visible()
        error_msg = page.locator("#app-fallback-msg").inner_text()
        sub_msg = page.locator("#app-fallback-sub").inner_text()
        print(f"Broken module error displayed: '{error_msg}' - '{sub_msg}'")
        assert "Gagal memuat sistem aplikasi" in error_msg or "Terjadi kendala" in error_msg, f"Unexpected script error copy: '{error_msg}'"
        assert page.locator("#app-fallback-retry").is_visible()
        page.screenshot(path=str(SHOTS_DIR / "error_module_broken.png"))
        print(f"[PASS] TEST 4 PASSED: Script error distinguished and displayed. Screenshot saved to {SHOTS_DIR / 'error_module_broken.png'}\n")
        page.close()

        # -------------------------------------------------------------
        # TEST 5: Mobile 375px Viewport & Responsive Layout Check
        # -------------------------------------------------------------
        print("--- TEST 5: Mobile 375px Viewport & Responsive Check ---")
        mobile_context = browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
        )
        page = mobile_context.new_page()

        # Slow 3G on mobile 375px
        mobile_cdp = mobile_context.new_cdp_session(page)
        mobile_cdp.send("Network.emulateNetworkConditions", {
            "offline": False,
            "latency": 300,
            "downloadThroughput": 100 * 1024,
            "uploadThroughput": 50 * 1024,
            "connectionType": "cellular3g"
        })

        page.goto(f"{base_url}/index.html")
        page.wait_for_timeout(1500)

        # Check mobile 375px loading state
        assert page.locator("#app-loading").is_visible()
        page.screenshot(path=str(SHOTS_DIR / "mobile_375px_loading_3s.png"))

        # Check for no horizontal overflow (scrollWidth <= 375)
        scroll_width = page.evaluate("document.documentElement.scrollWidth")
        print(f"Mobile scrollWidth during loading: {scroll_width}px (max allowed: 375px)")
        assert scroll_width <= 375, f"Horizontal overflow detected: {scroll_width}px > 375px"

        # Unthrottle so mobile finishes loading
        mobile_cdp.send("Network.emulateNetworkConditions", {
            "offline": False,
            "latency": 0,
            "downloadThroughput": -1,
            "uploadThroughput": -1
        })

        # Wait for data load on mobile
        page.wait_for_selector("#v-stocks .row", timeout=15000)
        scroll_width_loaded = page.evaluate("document.documentElement.scrollWidth")
        print(f"Mobile scrollWidth after load: {scroll_width_loaded}px (max allowed: 375px)")
        assert scroll_width_loaded <= 375, f"Horizontal overflow detected after load: {scroll_width_loaded}px > 375px"
        page.screenshot(path=str(SHOTS_DIR / "mobile_375px_loaded.png"))
        print(f"[PASS] TEST 5 PASSED: Mobile 375px responsive check passed with 0 overflow!\n")
        page.close()
        mobile_context.close()

        browser.close()

    server.shutdown()
    print("===============================================================")
    print("[ALL REGRESSION TESTS PASSED 100%]")
    print(f"Screenshots saved to: {SHOTS_DIR}")
    print("===============================================================")


if __name__ == "__main__":
    run_tests()
