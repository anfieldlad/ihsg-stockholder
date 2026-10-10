"""tests/test_auth_config.py — Pytest suite for M1-3 Frontend Auth & CSP configuration."""

import json
import os
import sys
from pathlib import Path
import importlib

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

import site_config


def test_auth_domain_in_site_config():
    """Verify site_config exports AUTH_DOMAIN with default ihsg-storm.firebaseapp.com."""
    assert hasattr(site_config, "AUTH_DOMAIN")
    assert site_config.AUTH_DOMAIN == "ihsg-storm.firebaseapp.com"


def test_auth_domain_env_override():
    """Verify AUTH_DOMAIN can be overridden via environment variable (cutover preparation)."""
    old_env = os.environ.get("AUTH_DOMAIN")
    try:
        os.environ["AUTH_DOMAIN"] = "ihsg.bad.ai.id"
        importlib.reload(site_config)
        assert site_config.AUTH_DOMAIN == "ihsg.bad.ai.id"
    finally:
        if old_env is not None:
            os.environ["AUTH_DOMAIN"] = old_env
        else:
            os.environ.pop("AUTH_DOMAIN", None)
        importlib.reload(site_config)


def test_csp_in_vercel_json_has_firebase():
    """Verify vercel.json includes Firebase origins in connect-src and frame-src."""
    vj_path = REPO_ROOT / "vercel.json"
    vj = json.loads(vj_path.read_text(encoding="utf-8"))
    csp = None
    for entry in vj.get("headers", []):
        for h in entry.get("headers", []):
            if h.get("key") == "Content-Security-Policy":
                csp = h.get("value")
    assert csp is not None
    assert "https://identitytoolkit.googleapis.com" in csp
    assert "https://securetoken.googleapis.com" in csp
    assert "https://accounts.google.com" in csp
    assert "https://ihsg-storm.firebaseapp.com" in csp


def test_cloudflare_headers_file_exists_and_matches():
    """Verify public/_headers exists and carries Content-Security-Policy with Firebase."""
    h_path = REPO_ROOT / "public" / "_headers"
    assert h_path.exists()
    content = h_path.read_text(encoding="utf-8")
    assert "Content-Security-Policy" in content
    assert "https://identitytoolkit.googleapis.com" in content
    assert "https://accounts.google.com" in content
    assert "https://ihsg-storm.firebaseapp.com" in content


def test_firebase_auth_bundle_committed_and_clean():
    """Verify assets/vendor/firebase-auth.js exists, non-empty, and has no analytics."""
    bundle_path = REPO_ROOT / "public" / "assets" / "vendor" / "firebase-auth.js"
    assert bundle_path.exists()
    content = bundle_path.read_text(encoding="utf-8")
    assert len(content) > 50000
    assert "getAnalytics" not in content
    assert "GoogleAuthProvider" in content
    assert "signInWithRedirect" in content


def test_header_auth_markup():
    """Verify public/index.html includes auth buttons, Indonesian copy, and no avatar img."""
    html_path = REPO_ROOT / "public" / "index.html"
    html = html_path.read_text(encoding="utf-8")
    assert "Masuk dengan Google" in html
    assert "Keluar" in html
    assert 'x-if="authEnabled"' in html
    assert "userTierLabel" in html
    assert "user.photoURL" not in html
    assert "user.photoUrl" not in html


def test_auth_js_flag_default_off():
    """Verify public/src/auth.js sets feature flag default to false (zero network)."""
    auth_path = REPO_ROOT / "public" / "src" / "auth.js"
    assert auth_path.exists()
    content = auth_path.read_text(encoding="utf-8")
    assert "let _authFlag = false;" in content
    assert "export function isAuthEnabled" in content
    assert "export function getToken" in content
