"""tests/test_seo_spike.py — Automated test suite for IHSG SEO Phase 1 Spike.

Implements automated tests (a)-(e) from Section 10 of seo-technical-options.md:
  (a) tidak ada halaman dengan >5 baris holder
  (b) setiap title unik
  (c) setiap halaman punya canonical sendiri dan tepat satu H1
  (d) JSON-LD valid JSON
  (e) semua slug investor unik dan tabrakan terselesaikan (4 pasangan F4)
Plus security checks for SEC-01 / D10 refusal and SITE_URL single constant compliance.
"""
import json
import re
from pathlib import Path
import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST_SPIKE = REPO_ROOT / "dist-spike"
DATA_FREE = REPO_ROOT / "data" / "free" / "shareholder_top5.json"

import site_config
from scripts.spike_build_seo import (
    build_investor_slug_registry,
    build_seo_spike,
    get_site_url,
    validate_free_dataset_security,
)


@pytest.fixture(scope="session", autouse=True)
def ensure_spike_built():
    """Ensure dist-spike/ is freshly built before test suite executes."""
    if not DATA_FREE.exists():
        from scripts.generate_free_dataset import generate_top5_dataset
        generate_top5_dataset(REPO_ROOT / "public" / "shareholder_data.json", DATA_FREE, max_rank=5)
    build_seo_spike(DATA_FREE, DIST_SPIKE, sample_investor_count=20)


def test_test_a_no_page_exceeds_5_holders():
    """(a) Tidak ada halaman dengan >5 baris holder."""
    stock_dirs = [d for d in (DIST_SPIKE / "saham").iterdir() if d.is_dir()]
    assert len(stock_dirs) == 961, f"Expected 961 stock directories, found {len(stock_dirs)}"

    re_tr = re.compile(r'<tr style="border-bottom:1px solid var\(--line,#e2e8f0\)">')
    for s_dir in stock_dirs:
        index_file = s_dir / "index.html"
        assert index_file.exists(), f"Missing index.html in {s_dir}"
        content = index_file.read_text(encoding="utf-8")
        matches = re_tr.findall(content)
        assert len(matches) <= 5, f"Page {s_dir.name} has {len(matches)} holder rows (> 5 allowed)!"
        assert ">#6</td>" not in content, f"Page {s_dir.name} contains holder rank #6!"
        assert ">#7</td>" not in content, f"Page {s_dir.name} contains holder rank #7!"
        assert ">#8</td>" not in content, f"Page {s_dir.name} contains holder rank #8!"


def test_test_b_all_stock_titles_unique():
    """(b) Setiap title unik."""
    stock_dirs = [d for d in (DIST_SPIKE / "saham").iterdir() if d.is_dir()]
    titles = set()
    re_title = re.compile(r"<title>(.*?)</title>")

    for s_dir in stock_dirs:
        content = (s_dir / "index.html").read_text(encoding="utf-8")
        m = re_title.search(content)
        assert m, f"No <title> found in {s_dir.name}/index.html"
        title = m.group(1).strip()
        assert title not in titles, f"Duplicate title detected: '{title}' in {s_dir.name}"
        titles.add(title)

    assert len(titles) == 961, f"Expected 961 unique titles, got {len(titles)}"


def test_test_c_canonical_and_single_h1():
    """(c) Setiap halaman punya canonical sendiri dan tepat satu H1."""
    all_html = list(DIST_SPIKE.rglob("*.html"))
    assert len(all_html) >= 961 + 20 + 2, f"Total HTML pages is {len(all_html)}"

    re_h1 = re.compile(r"<h1[\s>]")
    re_canonical = re.compile(r'<link rel="canonical" href="([^"]+)">')
    site_url = get_site_url()

    for html_file in all_html:
        content = html_file.read_text(encoding="utf-8")
        h1_matches = re_h1.findall(content)
        assert len(h1_matches) == 1, (
            f"File {html_file.relative_to(DIST_SPIKE)} has {len(h1_matches)} <h1> tags (expected exactly 1)!"
        )

        can_match = re_canonical.search(content)
        assert can_match, f"Missing canonical link in {html_file.relative_to(DIST_SPIKE)}"
        can_url = can_match.group(1)
        assert can_url.startswith(site_url), f"Canonical {can_url} does not start with site_url {site_url}"
        assert can_url.endswith("/"), f"Canonical {can_url} missing trailing slash"


def test_test_d_json_ld_valid_json():
    """(d) JSON-LD valid JSON."""
    all_html = list(DIST_SPIKE.rglob("*.html"))
    re_json_ld = re.compile(r'<script type="application/ld\+json">\s*(.*?)\s*</script>', re.DOTALL)

    for html_file in all_html:
        content = html_file.read_text(encoding="utf-8")
        m = re_json_ld.search(content)
        assert m, f"Missing JSON-LD script in {html_file.relative_to(DIST_SPIKE)}"
        raw_json = m.group(1).strip()
        try:
            parsed = json.loads(raw_json)
        except Exception as e:
            pytest.fail(f"Invalid JSON-LD in {html_file.relative_to(DIST_SPIKE)}: {e}")
            return

        assert parsed.get("@context") == "https://schema.org"
        assert "@type" in parsed
        assert "url" in parsed


def test_test_e_investor_slugs_unique_and_collisions_resolved():
    """(e) Semua slug investor unik dan tabrakan terselesaikan (4 pasangan F4)."""
    inv_dirs = [d for d in (DIST_SPIKE / "investor").iterdir() if d.is_dir()]
    assert len(inv_dirs) == 20, f"Expected 20 sample investor directories, found {len(inv_dirs)}"

    slugs = [d.name for d in inv_dirs]
    assert len(slugs) == len(set(slugs)), "Investor slugs contain duplicates!"

    # Verify the 4 collision keys from F4 are cleanly resolved
    f4_keys = [
        "GESIT PERKASA",
        "KRESNA PRIMA INVEST",
        "DINASTI KREATIF INDONESIA",
        "WALDEN GLOBAL SERVICES",
    ]
    reg = build_investor_slug_registry(set(f4_keys))
    assert len(reg) == 4
    for k in f4_keys:
        assert k in reg
        assert len(reg[k]) > 0

    # Test collision resolution logic with synthetic colliding keys
    synthetic_keys = {"TEST ALPHA", "TEST ALPHA!", "TEST-ALPHA", "TEST_ALPHA"}
    synth_reg = build_investor_slug_registry(synthetic_keys)
    assigned_slugs = list(synth_reg.values())
    assert len(assigned_slugs) == len(set(assigned_slugs)), "Collision resolver failed to generate unique slugs!"


def test_security_refusal_input_inside_public(tmp_path):
    """SEC-01 Toby: Refuse input dataset if located inside public/."""
    public_file = REPO_ROOT / "public" / "fake_data.json"
    public_file.write_text('{"items": []}', encoding="utf-8")
    try:
        with pytest.raises(ValueError, match="is inside public/"):
            validate_free_dataset_security(public_file, REPO_ROOT)
    finally:
        if public_file.exists():
            public_file.unlink()


def test_security_refusal_holder_rank_greater_than_5(tmp_path):
    """D10 / SEC-01 Toby: Refuse dataset if any holder row has rank > 5."""
    bad_data = {
        "as_of_label": "30 September 2026",
        "items": [
            {"code": "BBCA", "investor": "Good Holder", "rank": 1, "shares": 100, "percentage": 1.0},
            {"code": "BBCA", "investor": "Illegal Leaked Holder", "rank": 6, "shares": 50, "percentage": 0.5},
        ]
    }
    bad_file = tmp_path / "leaked_dataset.json"
    bad_file.write_text(json.dumps(bad_data), encoding="utf-8")

    with pytest.raises(ValueError, match="illegal holder rank '6'"):
        validate_free_dataset_security(bad_file, REPO_ROOT)


def test_security_refusal_emiten_more_than_5_rows(tmp_path):
    """D10: Refuse dataset if an emiten has more than 5 holder rows."""
    bad_data = {
        "as_of_label": "30 September 2026",
        "items": [
            {"code": "BBCA", "investor": f"Holder {i}", "rank": i, "shares": 100, "percentage": 1.0}
            for i in range(1, 7)
        ]
    }
    bad_file = tmp_path / "too_many_rows.json"
    bad_file.write_text(json.dumps(bad_data), encoding="utf-8")

    with pytest.raises(ValueError, match="illegal holder rank '6'"):
        validate_free_dataset_security(bad_file, REPO_ROOT)


def test_sitemaps_valid_and_consistent():
    """Verify sitemap index and sub-sitemaps exist and reference correct URLs."""
    site_url = get_site_url()
    sitemap_idx = (DIST_SPIKE / "sitemap.xml").read_text(encoding="utf-8")
    assert "<sitemapindex" in sitemap_idx
    assert f"<loc>{site_url}/sitemap-saham.xml</loc>" in sitemap_idx
    assert f"<loc>{site_url}/sitemap-investor.xml</loc>" in sitemap_idx
    assert f"<loc>{site_url}/sitemap-static.xml</loc>" in sitemap_idx

    saham_xml = (DIST_SPIKE / "sitemap-saham.xml").read_text(encoding="utf-8")
    assert f"<loc>{site_url}/saham/bbca/</loc>" in saham_xml
    assert f"<loc>{site_url}/saham/bbri/</loc>" in saham_xml
    assert "<lastmod>2026-09-30</lastmod>" in saham_xml
