"""tests/test_site_config.py — Test suite enforcing CEO Decision (Michael) for SITE_URL.

Rules enforced:
1. SITE_URL is defined in exactly ONE constant configuration file (`site_config.py`).
2. All site metadata (canonical, og:url, og:image, twitter:image, JSON-LD, sitemap,
   robots.txt, client config.js) are strictly in sync with site_config.SITE_URL.
3. Domain migration to bad.ai.id (or any new host) is verified to be a one-line change
   in site_config.py plus running `python scripts/build_site_metadata.py`.
4. 'badai.tech' does NOT appear in any code or script outside site_config.py and
   explicitly allow-listed documentation/legal text.
"""

import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

import site_config


def test_site_config_constant_exists():
    assert hasattr(site_config, "SITE_URL"), "site_config.py must export SITE_URL"
    assert site_config.SITE_URL.startswith("http"), (
        f"SITE_URL must be a valid HTTP(S) URL, got: {site_config.SITE_URL}"
    )
    assert not site_config.SITE_URL.endswith("/"), "SITE_URL should not have a trailing slash"


def test_env_var_override():
    import importlib
    old_env = os.environ.get("SITE_URL")
    try:
        os.environ["SITE_URL"] = "https://ihsg.bad.ai.id"
        importlib.reload(site_config)
        assert site_config.SITE_URL == "https://ihsg.bad.ai.id"
    finally:
        if old_env is not None:
            os.environ["SITE_URL"] = old_env
        else:
            os.environ.pop("SITE_URL", None)
        importlib.reload(site_config)


def test_metadata_files_in_sync_with_site_config():
    """Verify that build_site_metadata.py --check succeeds."""
    script = REPO_ROOT / "scripts" / "build_site_metadata.py"
    res = subprocess.run([sys.executable, str(script), "--check"], capture_output=True, text=True)
    assert res.returncode == 0, f"Metadata out of sync with site_config.py:\n{res.stdout}\n{res.stderr}"


def test_migration_rebuild_simulation(tmp_path):
    """Simulate domain migration to bad.ai.id: test update_index_html & generators."""
    from scripts.build_site_metadata import (
        generate_config_js,
        generate_robots_txt,
        generate_sitemap_xml,
        update_index_html,
    )

    # Verify that changing SITE_URL affects all generated metadata
    orig_url = site_config.SITE_URL
    orig_comp = site_config.COMPANY_URL
    try:
        site_config.SITE_URL = "https://ihsg.bad.ai.id"
        site_config.COMPANY_URL = "https://bad.ai.id"

        cfg_js = generate_config_js()
        assert "https://ihsg.bad.ai.id" in cfg_js

        sm_xml = generate_sitemap_xml()
        assert "<loc>https://ihsg.bad.ai.id/</loc>" in sm_xml
        assert "<lastmod>2026-09-30</lastmod>" in sm_xml

        rob_txt = generate_robots_txt()
        assert "Sitemap: https://ihsg.bad.ai.id/sitemap.xml" in rob_txt

        sample_html = (
            '<link rel="canonical" href="https://ihsg.badai.tech/">\n'
            '<meta property="og:url" content="https://ihsg.badai.tech/">\n'
            '<meta property="og:image" content="https://ihsg.badai.tech/og-image.png">\n'
            '<meta name="twitter:image" content="https://ihsg.badai.tech/og-image.png">\n'
            '{"url": "https://ihsg.badai.tech/"}'
        )
        updated = update_index_html(sample_html)
        assert "https://ihsg.bad.ai.id" in updated
        assert "badai.tech" not in updated, "Old domain must be completely replaced in rebuilt HTML"
    finally:
        site_config.SITE_URL = orig_url
        site_config.COMPANY_URL = orig_comp


def scan_repo_for_unauthorized_badai_tech(root_dir: Path) -> list[str]:
    # Allowed files with justification
    ALLOWLIST = {
        # The single constant file:
        Path("site_config.py"),
        # Legal & documentation text:
        Path("README.md"),                          # Project documentation
        Path("feedback_submissions.json"),         # Historical mock CS data
        Path("public/components/tab-faq.html"),     # Support email (help@badai.tech)
        # Test suites:
        Path("tests/test_site_config.py"),          # This test suite
        Path("tests/test_seo_phase0.py"),           # SEO validation assertions
        # Generated build files that mirror site_config.SITE_URL:
        Path("public/index.html"),
        Path("public/sitemap.xml"),
        Path("public/robots.txt"),
        Path("public/src/config.js"),
    }

    IGNORE_DIRS = {
        ".git",
        "__pycache__",
        ".pytest_cache",
        "node_modules",
        ".venv",
        "venv",
        "dist",
        "dist-spike",
    }

    violations = []

    for root, dirs, files in os.walk(root_dir):
        # Exclude ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

        for file in files:
            file_path = Path(root) / file
            rel_path = file_path.relative_to(root_dir)

            # Skip binaries and images
            if file_path.suffix in {".png", ".jpg", ".jpeg", ".ico", ".pdf", ".xlsx", ".pyc", ".woff2"}:
                continue

            try:
                content = file_path.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue

            if "badai.tech" in content:
                if rel_path not in ALLOWLIST:
                    violations.append(str(rel_path))

    return violations


def test_no_unauthorized_badai_tech_occurrences():
    """CEO DECISION TEST: Fails if 'badai.tech' appears anywhere outside site_config.py and allowlist."""
    violations = scan_repo_for_unauthorized_badai_tech(REPO_ROOT)
    assert not violations, (
        "CEO DECISION VIOLATION: 'badai.tech' found in files outside site_config.py "
        f"and allow-listed legal/doc text:\n{violations}\n"
        "All host references must derive from site_config.SITE_URL!"
    )


def test_scanner_catches_unauthorized_badai_tech(tmp_path):
    """Verify that the scanner actually detects an unauthorized badai.tech reference."""
    # Create mock repo with one authorized and one unauthorized file
    (tmp_path / "site_config.py").write_text("SITE_URL = 'https://ihsg.badai.tech'", encoding="utf-8")
    (tmp_path / "rogue_script.py").write_text("API = 'https://ihsg.badai.tech/api'", encoding="utf-8")

    violations = scan_repo_for_unauthorized_badai_tech(tmp_path)
    assert "rogue_script.py" in violations
    assert "site_config.py" not in violations
