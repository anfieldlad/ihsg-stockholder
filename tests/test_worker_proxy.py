"""
tests/test_worker_proxy.py - Test suite for Cloudflare Worker API proxy (worker.js / wrangler.json)
Verifies:
1. worker.js syntax and export structure
2. wrangler.json schema and configuration
3. Cloudflare Worker proxy and asset routing logic (via Node.js test runner)
4. URL rewriting and Host header logic parity
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
    """Verify worker.js exists in repository root."""
    assert WORKER_JS_PATH.exists(), f"worker.js missing at {WORKER_JS_PATH}"
    content = WORKER_JS_PATH.read_text(encoding="utf-8")
    assert "export default" in content
    assert "async fetch(request, env)" in content
    assert "https://ihsg.badai.tech" in content
    assert "env.ASSETS.fetch(request)" in content


def test_wrangler_config():
    """Verify wrangler.json exists and contains correct Cloudflare Worker configuration."""
    assert WRANGLER_JSON_PATH.exists(), f"wrangler.json missing at {WRANGLER_JSON_PATH}"
    config = json.loads(WRANGLER_JSON_PATH.read_text(encoding="utf-8"))

    assert config.get("name") == "ihsg-storm"
    assert config.get("main") == "worker.js"
    assert config.get("compatibility_date") == "2026-10-06"
    assert "assets" in config
    assert config["assets"].get("directory") == "./public"


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
    backend_base = "https://ihsg.badai.tech"

    api_test_urls = [
        ("https://ihsg.bad.ai.id/api/price/BBCA", "https://ihsg.badai.tech/api/price/BBCA"),
        ("https://ihsg.bad.ai.id/api/prices/batch?codes=BBCA,BBRI", "https://ihsg.badai.tech/api/prices/batch?codes=BBCA,BBRI"),
        ("https://ihsg.bad.ai.id/api/health", "https://ihsg.badai.tech/api/health"),
        ("https://ihsg.bad.ai.id/api/feedback", "https://ihsg.badai.tech/api/feedback"),
    ]

    for req_url, expected_target in api_test_urls:
        parsed = urlparse(req_url)
        assert parsed.path.startswith("/api/"), f"{req_url} should be an /api/ route"
        target_path_and_query = parsed.path + (f"?{parsed.query}" if parsed.query else "")
        target_url = urljoin(backend_base, target_path_and_query)
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


def test_worker_leak_guard():
    """Verify leak_guard passes and worker files are in repo root, not public/."""
    public_dir = REPO_ROOT / "public"
    passed, violations = check_directory(public_dir)
    assert passed is True, f"Leak guard failed on public/: {violations}"
    assert not (public_dir / "worker.js").exists()
    assert not (public_dir / "wrangler.json").exists()
