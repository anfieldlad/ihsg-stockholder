from pathlib import Path
import sys

try:
    import pytest
except ImportError:
    pytest = None

try:
    import playwright
except ImportError:
    if pytest is not None:
        pytestmark = pytest.mark.skip(reason="playwright not installed in standard test environment")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

def test_csp_header_in_vercel_json():
    import json
    vj_path = Path(__file__).resolve().parent.parent / "vercel.json"
    with open(vj_path) as f:
        vj = json.load(f)
    csp_header = None
    for entry in vj.get("headers", []):
        for h in entry.get("headers", []):
            if h.get("key") == "Content-Security-Policy":
                csp_header = h.get("value")
    assert csp_header is not None
    assert "'unsafe-inline'" in csp_header
