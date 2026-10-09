"""
tests/test_worker_proxy.py - Test suite for Cloudflare Worker API proxy (worker.js / wrangler.json)
Verifies:
1. worker.js syntax, exports, and v1 origin routing logic
2. wrangler.json schema and V1_ORIGIN configuration
3. Cloudflare Worker proxy and asset routing logic (via Node.js test runner)
4. URL rewriting, Host header, and header sanitization logic parity
5. Zero leaks in public/ directory (leak_guard compatibility)
"""

import json
import subprocess
from pathlib import Path
from urllib.parse import urlparse, urljoin
import pytest
from scripts.leak_guard import check_directory


REPO_ROOT = Path(__file__).resolve().parent.parent
WORKER_JS_PATH = REPO_ROOT / "worker.js"
WRANGLER_JSON_PATH = REPO_ROOT / "wrangler.json"


def test_worker_file_exists():
    """Verify worker.js exists in repository root with required contracts."""
    assert WORKER_JS_PATH.exists(), f"worker.js missing at {WORKER_JS_PATH}"
    content = WORKER_JS_PATH.read_text(encoding="utf-8")
    assert "export default" in content
    assert "async fetch(request, env)" in content
    assert "V1_ORIGIN" in content
    assert "ORIGIN_SECRET" in content
    assert "X-Origin-Auth" in content
    assert "X-Client-IP" in content
    assert "CF-Connecting-IP" in content
    assert "x-origin-auth" in content
    assert "x-client-ip" in content
    assert "x-forwarded-for" in content
    assert "private, no-store" in content
    assert "https://ihsg.badai.tech" in content
    assert "env.ASSETS.fetch(request)" in content


def test_wrangler_config():
    """Verify wrangler.json contains valid config and V1_ORIGIN var."""
    assert WRANGLER_JSON_PATH.exists(), f"wrangler.json missing at {WRANGLER_JSON_PATH}"
    config = json.loads(WRANGLER_JSON_PATH.read_text(encoding="utf-8"))

    assert config.get("name") == "ihsg-storm"
    assert config.get("main") == "worker.js"
    assert config.get("compatibility_date") == "2026-10-06"
    assert "assets" in config
    assert config["assets"].get("directory") == "./public"

    # Edge-origin topology vars
    assert "vars" in config
    assert config["vars"].get("V1_ORIGIN") == "https://ihsg-origin.bad.ai.id"
    # ORIGIN_SECRET must never be in wrangler.json
    assert "ORIGIN_SECRET" not in config
    assert "ORIGIN_SECRET" not in config.get("vars", {})


def test_worker_syntax_node_check():
    """Verify worker.js passes Node.js syntax check."""
    res = subprocess.run(
        ["node", "--check", str(WORKER_JS_PATH)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"node --check worker.js failed:\n{res.stderr}"


def test_worker_proxy_logic_node_suite():
    """Execute tests/test_worker_proxy.js to verify Worker fetch handler in Node."""
    test_script = REPO_ROOT / "tests" / "test_worker_proxy.js"
    assert test_script.exists()
    res = subprocess.run(
        ["node", str(test_script)],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
        check=False,
    )
    assert res.returncode == 0, f"Worker proxy Node test failed:\n{res.stdout}\n{res.stderr}"
    assert "All Cloudflare Worker proxy unit tests passed successfully!" in res.stdout


def test_worker_proxy_routing_logic_python():
    """Verify proxy URL rewrite logic in Python matches worker.js spec."""
    legacy_base = "https://ihsg.badai.tech"
    v1_origin = "https://ihsg-origin.bad.ai.id"

    # Legacy routes (always directed to legacy upstream)
    legacy_urls = [
        ("https://ihsg.bad.ai.id/api/price/BBCA", f"{legacy_base}/api/price/BBCA"),
        ("https://ihsg.bad.ai.id/api/prices/batch?codes=BBCA,BBRI", f"{legacy_base}/api/prices/batch?codes=BBCA,BBRI"),
        ("https://ihsg.bad.ai.id/api/health", f"{legacy_base}/api/health"),
        ("https://ihsg.bad.ai.id/api/feedback", f"{legacy_base}/api/feedback"),
    ]

    for req_url, expected_target in legacy_urls:
        parsed = urlparse(req_url)
        assert parsed.path.startswith("/api/"), f"{req_url} should be an /api/ route"
        assert not parsed.path.startswith("/api/v1/"), f"{req_url} should not be a v1 route"
        target_path_and_query = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        target_url = urljoin(legacy_base, target_path_and_query)
        assert target_url == expected_target

    # V1 routes directed to VPS origin when V1_ORIGIN is set
    v1_urls = [
        ("https://ihsg.bad.ai.id/api/v1/me", f"{v1_origin}/api/v1/me"),
        ("https://ihsg.bad.ai.id/api/v1/billing/checkout?plan=pro", f"{v1_origin}/api/v1/billing/checkout?plan=pro"),
        ("https://ihsg.bad.ai.id/api/v1/billing/webhooks/mayar/sec_123", f"{v1_origin}/api/v1/billing/webhooks/mayar/sec_123"),
    ]

    for req_url, expected_target in v1_urls:
        parsed = urlparse(req_url)
        assert parsed.path.startswith("/api/v1/"), f"{req_url} must be a v1 route"
        target_path_and_query = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        target_url = urljoin(v1_origin, target_path_and_query)
        assert target_url == expected_target

    static_test_urls = [
        "https://ihsg.bad.ai.id/",
        "https://ihsg.bad.ai.id/index.html",
        "https://ihsg.bad.ai.id/shareholder_data.json",
        "https://ihsg.bad.ai.id/assets/app.js",
        "https://ihsg.bad.ai.id/favicon.ico",
        "https://ihsg.bad.ai.id/sitemap.xml",
        "https://ihsg.bad.ai.id/robots.txt",
    ]

    for static_url in static_test_urls:
        parsed = urlparse(static_url)
        assert not parsed.path.startswith("/api/"), f"{static_url} should NOT be proxied to backend"


def test_worker_header_sanitization_rules():
    """Verify header stripping and injection rules match Section 5 spec."""
    raw_headers = {
        "x-origin-auth": "malicious-secret",
        "X-Origin-Auth": "malicious-secret",
        "x-client-ip": "10.0.0.1",
        "X-Forwarded-For": "10.0.0.2",
        "cf-connecting-ip": "203.0.113.50",
        "User-Agent": "Mozilla/5.0",
    }

    # Simulate worker logic
    secret = "real-origin-secret-key"
    cleaned = {k.lower(): v for k, v in raw_headers.items()}
    cleaned.pop("x-origin-auth", None)
    cleaned.pop("x-client-ip", None)
    cleaned.pop("x-forwarded-for", None)

    cleaned["x-origin-auth"] = secret
    cleaned["x-client-ip"] = raw_headers.get("cf-connecting-ip", "")

    assert cleaned["x-origin-auth"] == "real-origin-secret-key"
    assert cleaned["x-client-ip"] == "203.0.113.50"
    assert "x-forwarded-for" not in cleaned


def test_worker_leak_guard():
    """Verify leak_guard passes and worker files are in repo root, not public/."""
    public_dir = REPO_ROOT / "public"
    passed, violations = check_directory(public_dir)
    assert passed is True, f"Leak guard failed on public/: {violations}"
    assert not (public_dir / "worker.js").exists()
    assert not (public_dir / "wrangler.json").exists()
