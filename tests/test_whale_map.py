"""
tests/test_whale_map.py - Comprehensive Regression Test Suite for Whale Map (t_8dc70661)

Verifies:
1. Stock Detail on Mobile (375px):
   - Clicking 'Peta Relasi Pemegang (Whale Map)' renders into the visible mobile container.
   - Container has non-zero size (width > 0, height > 0).
   - ECharts canvas exists.
   - Chart has >= 2 nodes.
   - Zero console errors.
   - Captures after_mobile_375px_stock.png.

2. Stock Detail on Desktop (1280px):
   - Clicking 'Peta Relasi Pemegang (Whale Map)' renders into the desktop container.
   - Container has non-zero size.
   - ECharts canvas exists.
   - Chart has >= 2 nodes.
   - Zero console errors.
   - Captures after_desktop_1280px_stock.png.

3. Investor Detail on Mobile (375px):
   - Modal/sheet opens with Whale Map button.
   - Clicking button renders investor relations (investor -> portfolio stocks & relations).
   - Container has non-zero size.
   - ECharts canvas exists.
   - Chart has >= 2 nodes.
   - Zero console errors.
   - Captures after_mobile_375px_investor.png.

4. Investor Detail on Desktop (1280px):
   - Pane opens with Whale Map button.
   - Clicking button renders investor relations graph.
   - Container has non-zero size.
   - ECharts canvas exists with >= 2 nodes.
   - Zero console errors.
   - Captures after_desktop_1280px_investor.png.

5. Error State & 'Coba Lagi' Retry:
   - When echarts.min.js fails to load, Indonesian error message and retry button display.
   - Clicking 'Coba Lagi' triggers retry.
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

os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/home/hermes/tools/browser/cache"
from playwright.sync_api import sync_playwright

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"
SHOTS_DIR = Path("/home/hermes/company/ihsg/shots/whale")
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
        if self.path.startswith("/api/price"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"last_price":9250,"change_pct":0.5,"prices":{}}')
            return
        if self.path.startswith("/api/feedback/status"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"available":false}')
            return
        full_path = PUBLIC_DIR / self.path.lstrip("/")
        if not full_path.exists() and not self.path.startswith("/api"):
            print(f"[404 NOT FOUND REQUEST]: {self.path}")
        return super().do_GET()


def start_server(port: int):
    handler = functools.partial(QuietHandler, directory=str(PUBLIC_DIR))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def get_chart_diagnostics(page, container_id):
    return page.evaluate(f"""() => {{
        const el = document.getElementById('{container_id}');
        if (!el) return {{ found: false }};
        const canvas = el.querySelector('canvas');
        let nodeCount = 0;
        let edgeCount = 0;
        let nonTransparent = 0;
        if (canvas) {{
            const ctx = canvas.getContext('2d');
            if (ctx) {{
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                for (let i = 3; i < imgData.data.length; i += 4) {{
                    if (imgData.data[i] > 0) nonTransparent++;
                }}
            }}
        }}
        if (window.echarts) {{
            const chart = window.echarts.getInstanceByDom(el);
            if (chart) {{
                const opt = chart.getOption();
                if (opt && opt.series && opt.series[0] && opt.series[0].data) {{
                    nodeCount = opt.series[0].data.length;
                    edgeCount = (opt.series[0].links || []).length;
                }}
            }}
        }}
        return {{
            found: true,
            offsetParent: el.offsetParent !== null,
            offsetWidth: el.offsetWidth,
            offsetHeight: el.offsetHeight,
            hasCanvas: canvas !== null,
            canvasWidth: canvas ? canvas.width : 0,
            canvasHeight: canvas ? canvas.height : 0,
            nonTransparent: nonTransparent,
            nodeCount: nodeCount,
            edgeCount: edgeCount
        }};
    }}""")


def run_whale_regression():
    port = find_free_port()
    server = start_server(port)
    base_url = f"http://127.0.0.1:{port}"
    print(f"[TEST SERVER] Serving {PUBLIC_DIR} on {base_url}\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox", "--disable-dev-shm-usage"])

        # =============================================================
        # TEST 1: Stock Detail on Mobile (375px) - BBCA
        # =============================================================
        print("--- TEST 1: Stock Whale Map on Mobile (375px) ---")
        ctx_m = browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
        )
        page_m = ctx_m.new_page()
        console_errors_m = []
        page_m.on("response", lambda r: print(f"[HTTP {r.status}] {r.url}") if r.status >= 400 else None)
        page_m.on("console", lambda m: console_errors_m.append(m.text) if m.type == "error" else None)

        page_m.goto(f"{base_url}/index.html#/stock/BBCA")
        page_m.wait_for_selector("#sheet.on", state="visible", timeout=15000)
        page_m.wait_for_timeout(500)

        whale_btn_m = page_m.locator("#sheet button:has-text('Peta Relasi')")
        assert whale_btn_m.count() > 0, "Whale Map button not found in mobile sheet"
        whale_btn_m.first.click()

        # Wait for chart render
        page_m.wait_for_selector("#whaleMapContainerMobile canvas", state="visible", timeout=10000)
        page_m.wait_for_timeout(800)

        diag_m = get_chart_diagnostics(page_m, "whaleMapContainerMobile")
        print("Mobile Stock Diag:", json.dumps(diag_m, indent=2))

        assert diag_m["found"], "whaleMapContainerMobile must exist in DOM"
        assert diag_m["offsetParent"], "whaleMapContainerMobile must be visible (offsetParent != null)"
        assert diag_m["offsetWidth"] > 0, f"Container width must be > 0, got {diag_m['offsetWidth']}"
        assert diag_m["offsetHeight"] > 0, f"Container height must be > 0, got {diag_m['offsetHeight']}"
        assert diag_m["hasCanvas"], "Container must contain an ECharts canvas"
        assert diag_m["nonTransparent"] > 500, f"Expected non-transparent rendered pixels, got {diag_m['nonTransparent']}"
        assert diag_m["nodeCount"] >= 2, f"Expected >= 2 nodes, got {diag_m['nodeCount']}"
        assert len(console_errors_m) == 0, f"Expected 0 console errors, got {console_errors_m}"

        page_m.locator("#whaleMapContainerMobile").scroll_into_view_if_needed()
        page_m.screenshot(path=str(SHOTS_DIR / "after_mobile_375px_stock.png"))
        print(f"[PASS] TEST 1 PASSED! Saved {SHOTS_DIR / 'after_mobile_375px_stock.png'}\n")
        page_m.close()
        ctx_m.close()

        # =============================================================
        # TEST 2: Stock Detail on Desktop (1280px) - AADI
        # =============================================================
        print("--- TEST 2: Stock Whale Map on Desktop (1280px) ---")
        ctx_d = browser.new_context(viewport={"width": 1280, "height": 800})
        page_d = ctx_d.new_page()
        console_errors_d = []
        page_d.on("console", lambda m: console_errors_d.append(m.text) if m.type == "error" else None)

        page_d.goto(f"{base_url}/index.html#/stock/AADI")
        page_d.wait_for_selector("#pane", state="visible", timeout=15000)
        page_d.wait_for_timeout(500)

        whale_btn_d = page_d.locator("#pane button:has-text('Peta Relasi')")
        assert whale_btn_d.count() > 0, "Whale Map button not found in desktop pane"
        whale_btn_d.first.click()

        page_d.wait_for_selector("#whaleMapContainer canvas", state="visible", timeout=10000)
        page_d.wait_for_timeout(800)

        diag_d = get_chart_diagnostics(page_d, "whaleMapContainer")
        print("Desktop Stock Diag:", json.dumps(diag_d, indent=2))

        assert diag_d["found"], "whaleMapContainer must exist in DOM"
        assert diag_d["offsetParent"], "whaleMapContainer must be visible"
        assert diag_d["offsetWidth"] > 0, f"Container width must be > 0, got {diag_d['offsetWidth']}"
        assert diag_d["offsetHeight"] > 0, f"Container height must be > 0, got {diag_d['offsetHeight']}"
        assert diag_d["hasCanvas"], "Container must contain an ECharts canvas"
        assert diag_d["nonTransparent"] > 500, f"Expected non-transparent rendered pixels, got {diag_d['nonTransparent']}"
        assert diag_d["nodeCount"] >= 2, f"Expected >= 2 nodes, got {diag_d['nodeCount']}"
        assert len(console_errors_d) == 0, f"Expected 0 console errors, got {console_errors_d}"

        page_d.locator("#whaleMapContainer").scroll_into_view_if_needed()
        page_d.screenshot(path=str(SHOTS_DIR / "after_desktop_1280px_stock.png"))
        print(f"[PASS] TEST 2 PASSED! Saved {SHOTS_DIR / 'after_desktop_1280px_stock.png'}\n")
        page_d.close()
        ctx_d.close()

        # =============================================================
        # TEST 3: Investor Detail on Mobile (375px) - ANTHONI SALIM
        # =============================================================
        print("--- TEST 3: Investor Whale Map on Mobile (375px) ---")
        ctx_im = browser.new_context(
            viewport={"width": 375, "height": 812},
            user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148"
        )
        page_im = ctx_im.new_page()
        console_errors_im = []
        page_im.on("console", lambda m: console_errors_im.append(m.text) if m.type == "error" else None)

        page_im.goto(f"{base_url}/index.html#/investor/ANTHONI%20SALIM")
        page_im.wait_for_selector("#sheet.on", state="visible", timeout=15000)
        page_im.wait_for_timeout(500)

        whale_btn_im = page_im.locator("#sheet button:has-text('Peta Relasi')")
        assert whale_btn_im.count() > 0, "Whale Map button not found in mobile investor sheet"
        whale_btn_im.first.click()

        page_im.wait_for_selector("#whaleMapContainerInvMobile canvas", state="visible", timeout=10000)
        page_im.wait_for_timeout(800)

        diag_im = get_chart_diagnostics(page_im, "whaleMapContainerInvMobile")
        print("Mobile Investor Diag:", json.dumps(diag_im, indent=2))

        assert diag_im["found"], "whaleMapContainerInvMobile must exist in DOM"
        assert diag_im["offsetParent"], "whaleMapContainerInvMobile must be visible"
        assert diag_im["offsetWidth"] > 0, f"Container width must be > 0, got {diag_im['offsetWidth']}"
        assert diag_im["offsetHeight"] > 0, f"Container height must be > 0, got {diag_im['offsetHeight']}"
        assert diag_im["hasCanvas"], "Container must contain an ECharts canvas"
        assert diag_im["nonTransparent"] > 500, f"Expected non-transparent rendered pixels, got {diag_im['nonTransparent']}"
        assert diag_im["nodeCount"] >= 2, f"Expected >= 2 nodes, got {diag_im['nodeCount']}"
        assert len(console_errors_im) == 0, f"Expected 0 console errors, got {console_errors_im}"

        page_im.locator("#whaleMapContainerInvMobile").scroll_into_view_if_needed()
        page_im.screenshot(path=str(SHOTS_DIR / "after_mobile_375px_investor.png"))
        print(f"[PASS] TEST 3 PASSED! Saved {SHOTS_DIR / 'after_mobile_375px_investor.png'}\n")
        page_im.close()
        ctx_im.close()

        # =============================================================
        # TEST 4: Investor Detail on Desktop (1280px) - PT DWIMURIA
        # =============================================================
        print("--- TEST 4: Investor Whale Map on Desktop (1280px) ---")
        ctx_id = browser.new_context(viewport={"width": 1280, "height": 800})
        page_id = ctx_id.new_page()
        console_errors_id = []
        page_id.on("console", lambda m: console_errors_id.append(m.text) if m.type == "error" else None)

        page_id.goto(f"{base_url}/index.html#/investor/PT%20DWIMURIA%20INVESTAMA%20ANDALAN")
        page_id.wait_for_selector("#pane", state="visible", timeout=15000)
        page_id.wait_for_timeout(500)

        whale_btn_id = page_id.locator("#pane button:has-text('Peta Relasi')")
        assert whale_btn_id.count() > 0, "Whale Map button not found in desktop investor pane"
        whale_btn_id.first.click()

        page_id.wait_for_selector("#whaleMapContainerInv canvas", state="visible", timeout=10000)
        page_id.wait_for_timeout(800)

        diag_id = get_chart_diagnostics(page_id, "whaleMapContainerInv")
        print("Desktop Investor Diag:", json.dumps(diag_id, indent=2))

        assert diag_id["found"], "whaleMapContainerInv must exist in DOM"
        assert diag_id["offsetParent"], "whaleMapContainerInv must be visible"
        assert diag_id["offsetWidth"] > 0, f"Container width must be > 0, got {diag_id['offsetWidth']}"
        assert diag_id["offsetHeight"] > 0, f"Container height must be > 0, got {diag_id['offsetHeight']}"
        assert diag_id["hasCanvas"], "Container must contain an ECharts canvas"
        assert diag_id["nonTransparent"] > 500, f"Expected non-transparent rendered pixels, got {diag_id['nonTransparent']}"
        assert diag_id["nodeCount"] >= 2, f"Expected >= 2 nodes, got {diag_id['nodeCount']}"
        assert len(console_errors_id) == 0, f"Expected 0 console errors, got {console_errors_id}"

        page_id.locator("#whaleMapContainerInv").scroll_into_view_if_needed()
        page_id.screenshot(path=str(SHOTS_DIR / "after_desktop_1280px_investor.png"))
        print(f"[PASS] TEST 4 PASSED! Saved {SHOTS_DIR / 'after_desktop_1280px_investor.png'}\n")
        page_id.close()
        ctx_id.close()

        # =============================================================
        # TEST 5: Error State & Retry Handling
        # =============================================================
        print("--- TEST 5: Error State & Coba Lagi Retry Handling ---")
        ctx_err = browser.new_context(viewport={"width": 1280, "height": 800})
        page_err = ctx_err.new_page()

        # Abort echarts.min.js request to simulate network failure
        page_err.route("**/echarts.min.js", lambda route: route.abort("failed"))

        page_err.goto(f"{base_url}/index.html#/stock/BBCA")
        page_err.wait_for_selector("#pane", state="visible", timeout=15000)
        page_err.locator("#pane button:has-text('Peta Relasi')").first.click()

        # Verify error state appears inside container
        page_err.wait_for_selector("#whaleMapContainer .whale-error", state="visible", timeout=10000)
        err_text = page_err.locator("#whaleMapContainer .whale-error").inner_text()
        print("Error text displayed:", repr(err_text))
        assert "Gagal memuat visualisasi peta relasi" in err_text, f"Unexpected error copy: {err_text}"
        assert page_err.locator("#whaleMapContainer .whale-retry-btn").is_visible(), "Coba Lagi button must be visible"

        # Now unroute and click 'Coba Lagi'
        page_err.unroute("**/echarts.min.js")
        print("Clicking 'Coba Lagi' to recover...")
        page_err.locator("#whaleMapContainer .whale-retry-btn").click()

        # Canvas must now render successfully!
        page_err.wait_for_selector("#whaleMapContainer canvas", state="visible", timeout=10000)
        diag_rec = get_chart_diagnostics(page_err, "whaleMapContainer")
        assert diag_rec["hasCanvas"], "Canvas must exist after retry"
        assert diag_rec["nodeCount"] >= 2, "Chart must have >= 2 nodes after retry"
        print("[PASS] TEST 5 PASSED: Error state & retry verified successfully!\n")
        page_err.close()
        ctx_err.close()

        browser.close()

    server.shutdown()
    print("===============================================================")
    print("[ALL WHALE MAP REGRESSION TESTS PASSED 100%]")
    print(f"Screenshots saved to: {SHOTS_DIR}")
    print("===============================================================")


if __name__ == "__main__":
    run_whale_regression()
