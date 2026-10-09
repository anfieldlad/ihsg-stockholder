"""
tests/test_headers_parity.py - Unit test asserting security headers parity
Verifies that deploy/headers.json, vercel.json, and deploy/security-headers.conf match.
"""

from scripts.generate_headers import verify_or_sync, load_canonical_headers, build_nginx_snippet


def test_headers_parity_check():
    """Verify that committed files currently have 100% parity with deploy/headers.json."""
    assert verify_or_sync(check_only=True) is True


def test_canonical_headers_structure():
    """Verify deploy/headers.json has required security headers."""
    headers = load_canonical_headers()
    assert isinstance(headers, list)
    keys = {h["key"] for h in headers}
    required = {
        "X-Content-Type-Options",
        "Referrer-Policy",
        "X-Frame-Options",
        "Permissions-Policy",
        "Content-Security-Policy",
    }
    assert required.issubset(keys), f"Missing headers: {required - keys}"


def test_nginx_snippet_format():
    """Verify that build_nginx_snippet produces valid add_header lines."""
    headers = load_canonical_headers()
    snippet = build_nginx_snippet(headers)
    assert "add_header X-Content-Type-Options" in snippet
    assert "always;" in snippet
