"""tests/test_seo_phase0.py — Test suite for IHSG SEO Phase 0 deliverables.

Verifies:
1. og-image.png, apple-touch-icon.png, favicon set exist with exact dimensions.
2. public/index.html contains all required OG, Twitter, canonical, and icon tags.
3. sitemap.xml is valid XML with lastmod set to 2026-09-30 (KSEI snapshot date).
4. robots.txt contains valid Sitemap directive.
5. Local HTTP server serves og-image.png with HTTP 200, correct Content-Type and size.
"""

import functools
import http.server
import socket
import struct
import threading
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"


def get_png_dimensions(path: Path) -> tuple[int, int]:
    with open(path, "rb") as f:
        header = f.read(24)
        assert header.startswith(b"\x89PNG\r\n\x1a\n"), f"{path} is not a valid PNG"
        width, height = struct.unpack(">II", header[16:24])
        return width, height


def test_og_image_exists_and_dimensions():
    og_img = PUBLIC_DIR / "og-image.png"
    assert og_img.exists(), "public/og-image.png must exist"
    assert og_img.stat().st_size > 0, "og-image.png must not be empty"

    width, height = get_png_dimensions(og_img)
    assert width == 1200, f"Expected og-image width 1200, got {width}"
    assert height == 630, f"Expected og-image height 630, got {height}"


def test_brand_icons_exist_and_dimensions():
    icons = {
        "apple-touch-icon.png": (180, 180),
        "favicon-32.png": (32, 32),
        "favicon-192.png": (192, 192),
        "favicon-512.png": (512, 512),
    }
    for filename, (expected_w, expected_h) in icons.items():
        file_path = PUBLIC_DIR / filename
        assert file_path.exists(), f"public/{filename} must exist"
        assert file_path.stat().st_size > 0, f"{filename} must not be empty"
        w, h = get_png_dimensions(file_path)
        assert (w, h) == (expected_w, expected_h), (
            f"{filename} dimensions mismatch: got {w}x{h}, expected {expected_w}x{expected_h}"
        )

    # SVG and ICO must also exist
    assert (PUBLIC_DIR / "favicon.svg").exists(), "public/favicon.svg must exist"
    assert (PUBLIC_DIR / "favicon.ico").exists(), "public/favicon.ico must exist"


def test_index_html_og_and_seo_tags():
    index_html = PUBLIC_DIR / "index.html"
    assert index_html.exists(), "public/index.html must exist"
    content = index_html.read_text(encoding="utf-8")

    # Canonical must point to '/'
    assert '<link rel="canonical" href="https://ihsg.badai.tech/">' in content, (
        "Canonical link must point to https://ihsg.badai.tech/"
    )

    # Open Graph tags
    assert '<meta property="og:type" content="website">' in content
    assert '<meta property="og:url" content="https://ihsg.badai.tech/">' in content
    assert '<meta property="og:image" content="https://ihsg.badai.tech/og-image.png">' in content
    assert '<meta property="og:image:width" content="1200">' in content
    assert '<meta property="og:image:height" content="630">' in content
    assert '<meta property="og:image:alt"' in content
    assert '<meta property="og:site_name" content="IHSG Storm">' in content

    # Twitter Card tags
    assert '<meta name="twitter:card" content="summary_large_image">' in content
    assert '<meta name="twitter:image" content="https://ihsg.badai.tech/og-image.png">' in content

    # Favicons & Touch icons
    assert '<link rel="icon" href="/favicon.svg" type="image/svg+xml">' in content
    assert '<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">' in content
    assert '<link rel="alternate icon" href="/favicon.ico" type="image/x-icon">' in content
    assert '<link rel="apple-touch-icon" href="/apple-touch-icon.png"' in content

    # JSON-LD Structured Data
    assert '"url": "https://ihsg.badai.tech/"' in content, "JSON-LD url must match site url"


def test_sitemap_xml_validity_and_lastmod():
    sitemap = PUBLIC_DIR / "sitemap.xml"
    assert sitemap.exists(), "public/sitemap.xml must exist"

    # Must be valid XML
    tree = ET.parse(sitemap)
    root = tree.getroot()
    assert "urlset" in root.tag, "Root element of sitemap must be urlset"

    # Find namespace
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = root.findall("sm:url", ns)
    assert len(urls) >= 1, "Sitemap must contain at least 1 URL"

    home_url = urls[0]
    loc = home_url.find("sm:loc", ns)
    assert loc is not None and loc.text == "https://ihsg.badai.tech/", (
        f"Unexpected sitemap <loc>: {loc.text if loc is not None else None}"
    )

    lastmod = home_url.find("sm:lastmod", ns)
    assert lastmod is not None, "Sitemap must have a <lastmod> element"
    assert lastmod.text == "2026-09-30", (
        f"Expected sitemap lastmod to be 2026-09-30 (data snapshot date), got {lastmod.text}"
    )


def test_robots_txt_sitemap_directive():
    robots = PUBLIC_DIR / "robots.txt"
    assert robots.exists(), "public/robots.txt must exist"
    content = robots.read_text(encoding="utf-8")
    assert "Sitemap: https://ihsg.badai.tech/sitemap.xml" in content, (
        "robots.txt must include Sitemap line pointing to sitemap.xml"
    )


def test_local_server_serves_og_image_and_sitemap():
    """Spin up ephemeral local server on random free port and test HTTP responses."""
    # Find free port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        port = s.getsockname()[1]

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(PUBLIC_DIR))
    httpd = http.server.HTTPServer(("127.0.0.1", port), handler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    base_url = f"http://127.0.0.1:{port}"
    try:
        # 1. Test /og-image.png
        og_req = urllib.request.urlopen(f"{base_url}/og-image.png")
        assert og_req.status == 200, f"Expected 200, got {og_req.status}"
        assert og_req.headers.get_content_type() == "image/png", (
            f"Expected image/png, got {og_req.headers.get_content_type()}"
        )
        expected_size = (PUBLIC_DIR / "og-image.png").stat().st_size
        actual_size = int(og_req.headers.get("Content-Length", 0))
        assert actual_size == expected_size, (
            f"Content-Length mismatch: expected {expected_size}, got {actual_size}"
        )

        # 2. Test /sitemap.xml
        sm_req = urllib.request.urlopen(f"{base_url}/sitemap.xml")
        assert sm_req.status == 200, f"Expected 200, got {sm_req.status}"
        assert "xml" in sm_req.headers.get_content_type()

        # 3. Test /favicon-32.png
        fav_req = urllib.request.urlopen(f"{base_url}/favicon-32.png")
        assert fav_req.status == 200
        assert fav_req.headers.get_content_type() == "image/png"

        # 4. Test /apple-touch-icon.png
        ati_req = urllib.request.urlopen(f"{base_url}/apple-touch-icon.png")
        assert ati_req.status == 200
        assert ati_req.headers.get_content_type() == "image/png"
    finally:
        httpd.shutdown()
        httpd.server_close()
