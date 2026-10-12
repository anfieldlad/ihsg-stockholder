"""
tests/test_repo_clean.py - Keeps "frontend = frontend only" enforced.

The frontend repository holds the static site, the edge Worker, small build
tools and the UI tests. Backend code, Vercel configuration and raw KSEI data
files must not come back.
"""

import fnmatch
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

IGNORED_DIRS = {".git", "node_modules", "__pycache__", ".pytest_cache", ".ruff_cache", ".venv", "venv"}

FORBIDDEN_PATHS = [
    "server.py",
    "api",
    "vercel.json",
    ".vercelignore",
    ".vercel",
    "requirements.txt",
    "requirements-ingest.txt",
    "test_csp_browser.py",
    "feedback_submissions.json",
    "scripts/update_data.py",
    "scripts/normalize_investor.py",
    "scripts/parser_overrides.json",
]

FORBIDDEN_PATTERNS = [
    "scripts/shareholder_data*.pdf",
    "scripts/shareholder_data*.xlsx",
    "shareholder_data*.pdf",
    "shareholder_data*.xlsx",
]

# Python files allowed outside tests/: the stdlib-only build tools.
ALLOWED_ROOT_PYTHON = {
    "site_config.py",
    "scripts/build_site_metadata.py",
    "scripts/leak_guard.py",
    "scripts/verify_curl.py",
}

# Frontend sources that must not mention the retired host or Vercel headers.
SCANNED_FILES = ["worker.js", "wrangler.json", "README.md", "CONTRIBUTING.md"]
SCANNED_DIRS = ["public", "scripts"]
SCANNED_SKIP = {"public/shareholder_data.json"}
SCANNED_SUFFIXES = {".js", ".html", ".css", ".json", ".txt", ".xml", ".md", ".py"}

# Built from parts so this file does not match its own scan.
RETIRED_HOST = "badai" + ".tech"
VERCEL_HEADER = "x-" + "vercel"


def _tracked_files():
    """Return repo-relative POSIX paths of tracked files (git), or a directory walk."""
    try:
        out = subprocess.run(
            ["git", "ls-files"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        files = [line for line in out.splitlines() if line]
        if files:
            # Tracked files that were deleted in the working tree do not count.
            return [f for f in files if (REPO_ROOT / f).exists()]
    except (OSError, subprocess.CalledProcessError):
        pass
    found = []
    for root, dirs, names in os.walk(REPO_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        for name in names:
            found.append(Path(root, name).relative_to(REPO_ROOT).as_posix())
    return found


def test_no_backend_or_vercel_files():
    """Backend, Vercel and legacy pipeline paths are gone from the repo."""
    files = _tracked_files()
    present = []
    for forbidden in FORBIDDEN_PATHS:
        if any(f == forbidden or f.startswith(forbidden + "/") for f in files):
            present.append(forbidden)
    assert not present, f"Backend or Vercel files must not return: {present}"


def test_no_raw_data_files():
    """Raw KSEI/IDX pdf and xlsx files are never stored in the repo."""
    files = _tracked_files()
    offenders = [
        f for f in files if any(fnmatch.fnmatch(f, pat) for pat in FORBIDDEN_PATTERNS)
    ]
    offenders += [f for f in files if f.lower().endswith((".pdf", ".xlsx"))]
    assert not sorted(set(offenders)), f"Raw data files found: {sorted(set(offenders))}"


def test_python_files_are_frontend_tools_or_tests():
    """Outside tests/, only the stdlib build tools may be Python."""
    files = _tracked_files()
    stray = [
        f
        for f in files
        if f.endswith(".py") and not f.startswith("tests/") and f not in ALLOWED_ROOT_PYTHON
    ]
    assert not stray, f"Unexpected Python files outside tests/: {stray}"


def test_requirements_dev_is_standalone():
    """requirements-dev.txt lists test tools only and does not pull backend packages."""
    text = (REPO_ROOT / "requirements-dev.txt").read_text(encoding="utf-8")
    assert "-r " not in text
    lowered = text.lower()
    for backend_pkg in ("flask", "yfinance", "openpyxl", "requests"):
        assert backend_pkg not in lowered, f"{backend_pkg} is a backend dependency"


def test_retired_host_and_vercel_headers_absent():
    """Shipped sources do not reference the retired host or Vercel response headers."""
    paths = [REPO_ROOT / f for f in SCANNED_FILES if (REPO_ROOT / f).exists()]
    for d in SCANNED_DIRS:
        for root, dirs, names in os.walk(REPO_ROOT / d):
            dirs[:] = [x for x in dirs if x not in IGNORED_DIRS]
            for name in names:
                p = Path(root, name)
                if p.suffix in SCANNED_SUFFIXES:
                    paths.append(p)
    offenders = []
    for p in paths:
        rel = p.relative_to(REPO_ROOT).as_posix()
        if rel in SCANNED_SKIP:
            continue
        text = p.read_text(encoding="utf-8", errors="ignore").lower()
        if RETIRED_HOST in text or VERCEL_HEADER in text:
            offenders.append(rel)
    assert not offenders, f"Retired host or Vercel header referenced in: {offenders}"


def test_license_present():
    """LICENSE exists and is the proprietary notice."""
    text = (REPO_ROOT / "LICENSE").read_text(encoding="utf-8")
    assert "Proprietary License" in text
    assert "All rights reserved" in text
