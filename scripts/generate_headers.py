#!/usr/bin/env python3
"""
scripts/generate_headers.py - Generate and verify security headers parity across Vercel and nginx
Source of truth: deploy/headers.json
Targets:
  - vercel.json (headers[0].headers)
  - deploy/security-headers.conf (nginx add_header directives)

Supports:
  --check : exit 0 if committed files match deploy/headers.json, exit 1 if drift detected.
  --write : regenerate deploy/security-headers.conf and sync into vercel.json.
"""

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
HEADERS_JSON_PATH = REPO_ROOT / "deploy" / "headers.json"
NGINX_CONF_PATH = REPO_ROOT / "deploy" / "security-headers.conf"
VERCEL_JSON_PATH = REPO_ROOT / "vercel.json"


def load_canonical_headers():
    if not HEADERS_JSON_PATH.exists():
        raise FileNotFoundError(f"Canonical headers not found: {HEADERS_JSON_PATH}")
    with open(HEADERS_JSON_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def build_nginx_snippet(headers):
    lines = [
        "# Security headers generated from deploy/headers.json - DO NOT EDIT DIRECTLY",
        "# Regenerate with: python3 scripts/generate_headers.py",
    ]
    for h in headers:
        key = h["key"]
        val = h["value"]
        lines.append(f'add_header {key} "{val}" always;')
    return "\n".join(lines) + "\n"


def verify_or_sync(check_only: bool = False) -> bool:
    headers = load_canonical_headers()
    expected_nginx = build_nginx_snippet(headers)

    drift_found = False

    # 1. Check/sync nginx snippet
    if not NGINX_CONF_PATH.exists():
        print(f"[headers-parity] Mismatch: {NGINX_CONF_PATH} does not exist.")
        drift_found = True
        actual_nginx = ""
    else:
        actual_nginx = NGINX_CONF_PATH.read_text(encoding="utf-8")
        if actual_nginx.strip() != expected_nginx.strip():
            print(f"[headers-parity] Mismatch in {NGINX_CONF_PATH}:")
            print("--- Expected ---")
            print(expected_nginx)
            print("--- Actual ---")
            print(actual_nginx)
            drift_found = True

    # 2. Check/sync vercel.json
    if not VERCEL_JSON_PATH.exists():
        print(f"[headers-parity] Mismatch: {VERCEL_JSON_PATH} does not exist.")
        drift_found = True
        vj_data = {}
    else:
        with open(VERCEL_JSON_PATH, "r", encoding="utf-8") as f:
            vj_data = json.load(f)

        vj_headers_list = vj_data.get("headers", [])
        if not vj_headers_list or "headers" not in vj_headers_list[0]:
            print(f"[headers-parity] Mismatch: {VERCEL_JSON_PATH} has no headers section.")
            drift_found = True
            current_vj_headers = []
        else:
            current_vj_headers = vj_headers_list[0]["headers"]
            if current_vj_headers != headers:
                print(f"[headers-parity] Mismatch in {VERCEL_JSON_PATH} headers:")
                print("--- Expected ---")
                print(json.dumps(headers, indent=2))
                print("--- Actual ---")
                print(json.dumps(current_vj_headers, indent=2))
                drift_found = True

    if check_only:
        if drift_found:
            print("[headers-parity ERROR] Drift detected between deploy/headers.json, vercel.json, and nginx snippet.")
            print("Run 'python3 scripts/generate_headers.py' to synchronize.")
            return False
        else:
            print("[headers-parity PASS] vercel.json and deploy/security-headers.conf match deploy/headers.json.")
            return True

    # Write / sync mode
    NGINX_CONF_PATH.parent.mkdir(parents=True, exist_ok=True)
    NGINX_CONF_PATH.write_text(expected_nginx, encoding="utf-8")
    print(f"[headers-parity] Wrote {NGINX_CONF_PATH}")

    if VERCEL_JSON_PATH.exists():
        if not vj_data.get("headers"):
            vj_data["headers"] = [{"source": "/(.*)", "headers": headers}]
        else:
            vj_data["headers"][0]["headers"] = headers
        with open(VERCEL_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(vj_data, f, indent=2)
            f.write("\n")
        print(f"[headers-parity] Updated {VERCEL_JSON_PATH}")

    return True


def main():
    parser = argparse.ArgumentParser(description="Generate and verify security headers parity")
    parser.add_argument("--check", action="store_true", help="Check parity without writing files")
    args = parser.parse_args()

    success = verify_or_sync(check_only=args.check)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
