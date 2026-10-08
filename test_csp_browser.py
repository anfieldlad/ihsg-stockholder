import asyncio
import http.server
import json
import os
from pathlib import Path
import socketserver
import threading

REPO_ROOT = Path(__file__).resolve().parent
os.environ["PLAYWRIGHT_BROWSERS_PATH"] = "/home/hermes/tools/browser/cache"

# Read vercel.json headers
vercel_json_path = REPO_ROOT / "vercel.json"
with open(vercel_json_path) as f:
    vj = json.load(f)

csp_header = None
for entry in vj.get("headers", []):
    for h in entry.get("headers", []):
        if h.get("key") == "Content-Security-Policy":
            csp_header = h.get("value")

print(f"Loaded CSP Header from {vercel_json_path}:")
print(csp_header)
assert csp_header, "Content-Security-Policy header not found in vercel.json"
assert "'unsafe-inline'" in csp_header, "'unsafe-inline' missing from Content-Security-Policy"

class CspHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

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
        super().do_GET()

    def end_headers(self):
        if csp_header:
            self.send_header("Content-Security-Policy", csp_header)
        super().end_headers()

def run_test():
    server = socketserver.TCPServer(("127.0.0.1", 0), CspHandler)
    port = server.server_address[1]
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"Test server running on port {port} with CSP header")

    async def test_browser():
        from playwright.async_api import async_playwright
        console_logs = []
        page_errors = []

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
            page.on("pageerror", lambda err: page_errors.append(str(err)))

            print(f"Navigating to http://127.0.0.1:{port}/ ...")
            await page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
            await asyncio.sleep(4)  # Wait past the 3s fallback timer

            title = await page.title()
            fallback_visible = await page.is_visible("#app-fallback")
            stocks_table_visible = await page.is_visible("#v-stocks")

            print("Page Title:", title)
            print("Fallback visible (#app-fallback):", fallback_visible)
            print("Stocks table visible (#v-stocks):", stocks_table_visible)
            
            csp_errors = [l for l in console_logs if "Content Security Policy" in l or "violates" in l]
            error_logs = [l for l in console_logs if "[error]" in l]
            print(f"CSP error logs count: {len(csp_errors)}")
            for log in csp_errors:
                print("  CSP VIOLATION:", log)

            print(f"Total console error logs: {len(error_logs)}")
            for log in error_logs:
                print("  CONSOLE ERROR:", log)

            print(f"Page errors count: {len(page_errors)}")
            for err in page_errors:
                print("  PAGE ERROR:", err)

            await browser.close()

            # Assertions
            assert len(csp_errors) == 0, f"CSP violation errors detected: {csp_errors}"
            assert len(page_errors) == 0, f"Encountered page errors: {page_errors}"
            assert not fallback_visible, "App fallback (#app-fallback) is unexpectedly visible"
            assert stocks_table_visible, "Stocks table (#v-stocks) failed to mount"
            assert len(error_logs) == 0, f"Encountered console errors: {error_logs}"
            print("\nCSP BROWSER TEST PASSED SUCCESSFULLY!")

    try:
        asyncio.run(test_browser())
    finally:
        server.shutdown()

if __name__ == "__main__":
    run_test()
