"""
tests/capture_brand_shots.py - Capture release candidate screenshots for Angela & Toby
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
SHOTS_DIR = Path("/home/hermes/company/ihsg/shots/release-rc")
SHOTS_DIR.mkdir(parents=True, exist_ok=True)


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


def capture():
    port = find_free_port()
    server = start_server(port)
    base_url = f"http://127.0.0.1:{port}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])

        # 1. Desktop 1280x800 Light
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()
        page.goto(f"{base_url}/index.html", wait_until="networkidle")
        page.wait_for_selector("#v-stocks .row", timeout=15000)
        page.wait_for_timeout(500)
        page.screenshot(path=str(SHOTS_DIR / "stocks_1280x800.png"))
        print(f"[SAVED] {SHOTS_DIR / 'stocks_1280x800.png'}")

        # Dark Desktop
        page.locator(".rail-bottom .theme-btn").click()
        page.wait_for_timeout(300)
        page.screenshot(path=str(SHOTS_DIR / "dark_1280x800.png"))
        print(f"[SAVED] {SHOTS_DIR / 'dark_1280x800.png'}")
        page.close()
        ctx.close()

        # 2. Mobile 375x812 Light
        m_ctx = browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
        )
        m_page = m_ctx.new_page()
        m_page.goto(f"{base_url}/index.html", wait_until="networkidle")
        m_page.wait_for_selector("#v-stocks .row", timeout=15000)
        m_page.wait_for_timeout(500)

        # Check overflow
        sw = m_page.evaluate("document.documentElement.scrollWidth")
        print(f"Mobile 375px scrollWidth: {sw}px (PASS <= 375)")
        assert sw <= 375, f"Overflow on mobile: {sw} > 375"

        m_page.screenshot(path=str(SHOTS_DIR / "stocks_375x812.png"))
        print(f"[SAVED] {SHOTS_DIR / 'stocks_375x812.png'}")

        # Dark Mobile
        m_page.locator("header.top .theme-btn").click()
        m_page.wait_for_timeout(300)
        m_page.screenshot(path=str(SHOTS_DIR / "dark_375x812.png"))
        print(f"[SAVED] {SHOTS_DIR / 'dark_375x812.png'}")

        # Whale Map Mobile
        m_page.locator("header.top .theme-btn").click() # back to light
        m_page.wait_for_timeout(200)
        m_page.goto(f"{base_url}/index.html#/stock/BBCA")
        m_page.wait_for_selector("#sheet.on", state="visible", timeout=15000)
        m_page.wait_for_timeout(500)
        m_page.locator("#sheet button:has-text('Peta Relasi')").first.click()
        m_page.wait_for_selector("#whaleMapContainerMobile canvas", state="visible", timeout=10000)
        m_page.wait_for_timeout(800)
        m_page.locator("#whaleMapContainerMobile").scroll_into_view_if_needed()
        m_page.screenshot(path=str(SHOTS_DIR / "whale_mobile_375x812.png"))
        print(f"[SAVED] {SHOTS_DIR / 'whale_mobile_375x812.png'}")

        m_page.close()
        m_ctx.close()
        browser.close()

    server.shutdown()
    print("[ALL SCREENSHOTS CAPTURED]")


if __name__ == "__main__":
    capture()
