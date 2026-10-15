"""
tests/test_frontend_node.py - Node-based frontend checks run from pytest.
Runs the Node test scripts for module imports, max holders (AADI 41.1%) and analytics,
and checks that the static data file is present and well formed.
"""

import json
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def _run_node(script: str) -> None:
    res = subprocess.run(
        ["node", script],
        capture_output=True,
        text=True,
        check=False,
        cwd=REPO_ROOT,
    )
    assert res.returncode == 0, f"{script} failed:\n{res.stdout}\n{res.stderr}"


def test_static_entry_files_present():
    """The static site entry point, stylesheet and data file exist and are well formed."""
    html = (REPO_ROOT / "public" / "index.html").read_text(encoding="utf-8")
    assert "IHSG Storm" in html
    assert "assets/css/style.css" in html

    css = (REPO_ROOT / "public" / "assets" / "css" / "style.css").read_text(encoding="utf-8")
    assert "--font" in css
    assert "--bg" in css

    data = json.loads((REPO_ROOT / "public" / "shareholder_data.json").read_text(encoding="utf-8"))
    assert "items" in data


def test_node_module_imports():
    """Verify Node module imports and contracts pass."""
    _run_node("tests/test_module_imports.js")


def test_node_max_holders_and_aadi():
    """Verify max holder calculations and AADI 41.1%."""
    _run_node("tests/test_max_holders.js")


def test_node_analytics():
    """Verify cookieless privacy analytics and store integration."""
    for script in ["tests/test_analytics.js", "tests/test_analytics_store.js"]:
        _run_node(script)


def test_node_f1_diff_ui():
    """F1 diff UI: formatting, row states, gating, markup guards."""
    _run_node("tests/test_f1_diff.js")


def test_node_screener():
    """F5 Screener UI: acceptance metrics, derivation, gating, and store tests."""
    _run_node("tests/test_screener.js")


def test_node_faq():
    """FAQ: topic chips, search filter, empty state, and copy contracts."""
    _run_node("tests/test_faq.js")


def test_node_watchlist():
    """Watchlist Pantauan (P1): row states, sorting, star flows, gates, unsubscribe logic."""
    _run_node("tests/test_watchlist.js")
