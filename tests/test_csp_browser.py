from pathlib import Path
import sys

try:
    import pytest
except ImportError:
    pytest = None

try:
    import playwright
except ImportError:
    playwright = None

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def test_csp_header_in_headers_file():
    headers_path = Path(__file__).resolve().parent.parent / "public" / "_headers"
    csp_header = None
    for line in headers_path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("Content-Security-Policy:"):
            csp_header = stripped.split(":", 1)[1].strip()
    assert csp_header is not None
    assert "'unsafe-inline'" in csp_header
    assert "https://cloud.umami.is" in csp_header
    assert "https://gateway.umami.is" in csp_header
    assert "https://api-gateway.umami.dev" in csp_header
    assert "https://static.cloudflareinsights.com" in csp_header
    assert "https://identitytoolkit.googleapis.com" in csp_header
    assert "https://securetoken.googleapis.com" in csp_header
    assert "https://accounts.google.com" in csp_header
    assert "https://ihsg-storm.firebaseapp.com" in csp_header
