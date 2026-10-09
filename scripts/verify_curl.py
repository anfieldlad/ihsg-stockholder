#!/usr/bin/env python3
"""scripts/verify_curl.py — Start local server for public/ and run curl -I checks.

Per task spec:
"Verify by serving public/ locally and checking with curl -I."
"""

import functools
import http.server
import socket
import subprocess
import threading
from pathlib import Path

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"


def run_curl_head(url: str) -> str:
    res = subprocess.run(["curl", "-s", "-I", url], capture_output=True, text=True, check=True)
    return res.stdout


def main():
    # Bind to an open ephemeral port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(PUBLIC_DIR))
    httpd = http.server.HTTPServer(("127.0.0.1", port), handler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    base_url = f"http://127.0.0.1:{port}"
    print(f"Serving {PUBLIC_DIR} on {base_url}...")

    paths_to_check = [
        "/og-image.png",
        "/apple-touch-icon.png",
        "/favicon-32.png",
        "/favicon-192.png",
        "/favicon-512.png",
        "/favicon.svg",
        "/favicon.ico",
        "/sitemap.xml",
        "/robots.txt",
        "/index.html",
    ]

    all_passed = True

    try:
        for path in paths_to_check:
            url = f"{base_url}{path}"
            output = run_curl_head(url)
            lines = output.strip().splitlines()
            status_line = lines[0] if lines else "NO RESPONSE"
            print(f"\n--- Checking curl -I {path} ---")
            print(output.strip())

            if "200 OK" not in status_line:
                print(f"[FAIL] Expected 200 OK for {path}, got: {status_line}")
                all_passed = False
            else:
                print(f"[PASS] {path} returned 200 OK")

    finally:
        httpd.shutdown()
        httpd.server_close()

    if not all_passed:
        raise SystemExit(1)
    print("\nAll curl -I verification checks PASSED successfully!")


if __name__ == "__main__":
    main()
