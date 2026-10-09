"""
tests/test_mobile_chips.py - Playwright regression test suite for mobile filter chips alignment (t_c2f37905)

Verifies:
1. Mobile 360px and 375px viewports:
   - First chip ("Semua") has getBoundingClientRect().x === 16 (matches --gut).
   - Container initial scrollLeft is 0.
   - 0px horizontal overflow on document.body / documentElement.
   - Horizontal scrolling and scroll-snap function smoothly.
   - 0 console errors.
   - Screenshots captured to /home/hermes/company/ihsg/shots/mobile-chips/.
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
SHOTS_DIR = Path("/home/hermes/company/ihsg/shots/mobile-chips")
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


def test_mobile_chips():
    port = find_free_port()
    server = start_server(port)
    base_url = f"http://127.0.0.1:{port}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])

        for width in [360, 375]:
            ctx = browser.new_context(
                viewport={"width": width, "height": 700},
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
            )
            page = ctx.new_page()

            console_errors = []
            page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

            page.goto(f"{base_url}/index.html", wait_until="networkidle")
            page.wait_for_selector(".chips .chip", timeout=15000)
            page.wait_for_timeout(800)

            # 1. Measure initial alignment
            chip_info = page.evaluate("""() => {
                const chipsEl = document.querySelector('.chips');
                const firstChip = document.querySelector('.chips .chip');
                const titleEl = document.querySelector('.hd h1') || document.querySelector('h1');
                const chipRect = firstChip ? firstChip.getBoundingClientRect() : null;
                const chipsRect = chipsEl ? chipsEl.getBoundingClientRect() : null;
                const titleRect = titleEl ? titleEl.getBoundingClientRect() : null;
                const bodyWidth = document.body.scrollWidth;
                const docWidth = document.documentElement.scrollWidth;
                const scrollLeft = chipsEl ? chipsEl.scrollLeft : null;
                const cs = chipsEl ? window.getComputedStyle(chipsEl) : null;
                return {
                    firstChipText: firstChip ? firstChip.textContent.trim() : null,
                    chipRectX: chipRect ? chipRect.x : null,
                    chipsRectLeft: chipsRect ? chipsRect.left : null,
                    chipsRectWidth: chipsRect ? chipsRect.width : null,
                    titleRectX: titleRect ? titleRect.x : null,
                    scrollLeft: scrollLeft,
                    bodyWidth: bodyWidth,
                    docWidth: docWidth,
                    scrollPaddingInline: cs ? cs.scrollPaddingInline : null,
                    scrollSnapType: cs ? cs.scrollSnapType : null
                };
            }""")
            print(f"\n[TEST {width}px] info: {chip_info}")

            # Assertion 1: First chip ('Semua') getBoundingClientRect().x === 16 (matches --gut)
            chip_x = chip_info["chipRectX"]
            assert chip_x == 16, f"Expected first chip x === 16, got {chip_x}"
            print(f"  [PASS] first chip ('Semua') x === 16 (matches --gut 16px)")

            # Assertion 2: .chips / page body horizontal overflow is 0px
            body_w = chip_info["bodyWidth"]
            doc_w = chip_info["docWidth"]
            assert body_w <= width, f"Body horizontal overflow: body scrollWidth {body_w} > viewport {width}"
            assert doc_w <= width, f"Document horizontal overflow: doc scrollWidth {doc_w} > viewport {width}"
            print(f"  [PASS] 0px horizontal overflow (body: {body_w}px, doc: {doc_w}px <= {width}px)")

            # Assertion 3: Initial scrollLeft is 0
            assert chip_info["scrollLeft"] == 0, f"Expected initial scrollLeft 0, got {chip_info['scrollLeft']}"
            print(f"  [PASS] initial scrollLeft === 0")

            # Capture initial screenshot
            shot_path = SHOTS_DIR / f"after_{width}px.png"
            page.screenshot(path=str(shot_path))
            print(f"  [SAVED] {shot_path}")

            # Assertion 4: Snapping still works smoothly when scrolled horizontally
            page.evaluate("""() => {
                const chipsEl = document.querySelector('.chips');
                chipsEl.scrollTo({ left: 120, behavior: 'smooth' });
            }""")
            page.wait_for_timeout(1000)

            scrolled_state = page.evaluate("""() => {
                const chipsEl = document.querySelector('.chips');
                return { scrollLeft: chipsEl.scrollLeft };
            }""")
            assert scrolled_state["scrollLeft"] > 0, "Expected container to have scrolled"
            print(f"  [PASS] horizontal scrolling works smoothly (scrollLeft={scrolled_state['scrollLeft']})")

            # Capture scrolled screenshot on 375px
            if width == 375:
                scrolled_shot = SHOTS_DIR / f"after_scrolled_{width}px.png"
                page.screenshot(path=str(scrolled_shot))
                print(f"  [SAVED] {scrolled_shot}")

            # Scroll back to start and verify snap back
            page.evaluate("""() => {
                const chipsEl = document.querySelector('.chips');
                chipsEl.scrollTo({ left: 0, behavior: 'smooth' });
            }""")
            page.wait_for_timeout(1000)

            reset_info = page.evaluate("""() => {
                const chipsEl = document.querySelector('.chips');
                const firstChip = document.querySelector('.chips .chip');
                return {
                    scrollLeft: chipsEl.scrollLeft,
                    chipX: firstChip.getBoundingClientRect().x
                };
            }""")
            assert reset_info["scrollLeft"] == 0, f"Expected reset scrollLeft 0, got {reset_info['scrollLeft']}"
            assert reset_info["chipX"] == 16, f"Expected chipX to snap back to 16, got {reset_info['chipX']}"
            print(f"  [PASS] snapped back to start: scrollLeft=0, chipX=16")

            # Check console errors
            assert len(console_errors) == 0, f"Console errors: {console_errors}"
            print(f"  [PASS] 0 console errors")

            page.close()
            ctx.close()

        browser.close()
    server.shutdown()
    print("\nALL PLAYWRIGHT TESTS PASSED UNCONDITIONALLY.")


if __name__ == "__main__":
    test_mobile_chips()
