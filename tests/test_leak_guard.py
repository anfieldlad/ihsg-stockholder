"""
tests/test_leak_guard.py - Test suite for scripts/leak_guard.py
"""

import tempfile
from pathlib import Path
from scripts.leak_guard import check_directory


def test_leak_guard_passes_on_current_public_root():
    """Verify that current public/ directory is completely clean of leaks."""
    repo_root = Path(__file__).resolve().parent.parent
    public_dir = repo_root / "public"
    passed, violations = check_directory(public_dir)
    assert passed is True, f"Leak guard failed on public/: {violations}"
    assert len(violations) == 0


def test_leak_guard_detects_server_py():
    """Verify that leak guard catches server.py inside public/."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        (tmp_path / "server.py").write_text("# leak")
        passed, violations = check_directory(tmp_path)
        assert passed is False
        assert any("server.py" in v for v in violations)


def test_leak_guard_detects_xlsx():
    """Verify that leak guard catches *.xlsx inside public/."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        (tmp_path / "data_SEP2026.xlsx").write_bytes(b"PK")
        passed, violations = check_directory(tmp_path)
        assert passed is False
        assert any(".xlsx" in v for v in violations)


def test_leak_guard_detects_forbidden_dirs():
    """Verify that leak guard catches tests/ and scripts/ directories."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        (tmp_path / "tests").mkdir()
        (tmp_path / "scripts").mkdir()
        passed, violations = check_directory(tmp_path)
        assert passed is False
        assert any("tests" in v for v in violations)
        assert any("scripts" in v for v in violations)
