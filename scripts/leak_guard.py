#!/usr/bin/env python3
"""
scripts/leak_guard.py - Security leak guard for public web root
Fails if any forbidden files (server.py, *.xlsx, tests/, scripts/, etc.) are under public/.
Used in CI and pre-deploy verification (SEC-02, M0-1, M0-3).
"""

import os
import sys
import fnmatch
from pathlib import Path
from typing import List, Tuple

# Patterns that must NEVER exist inside public/
FORBIDDEN_FILE_PATTERNS = [
    "server.py",
    "*.xlsx",
    "*.py",
    "requirements*.txt",
    "feedback_submissions.json",
    ".env*",
    ".git*",
]

# Directory names that must NEVER exist inside public/
FORBIDDEN_DIR_NAMES = [
    "tests",
    "scripts",
    ".git",
]


def check_directory(public_dir: Path) -> Tuple[bool, List[str]]:
    """Scan public_dir recursively and return (passed, violations)."""
    violations: List[str] = []

    if not public_dir.exists():
        return False, [f"Public directory does not exist: {public_dir}"]

    for root, dirs, files in os.walk(public_dir):
        rel_root = Path(root).relative_to(public_dir)

        # Check forbidden directories
        for d in dirs:
            if d.lower() in [f.lower() for f in FORBIDDEN_DIR_NAMES]:
                v_path = str(rel_root / d) if str(rel_root) != "." else d
                violations.append(f"Forbidden directory found: {v_path}/")

        # Check forbidden files
        for f in files:
            rel_file = str(rel_root / f) if str(rel_root) != "." else f
            for pattern in FORBIDDEN_FILE_PATTERNS:
                if fnmatch.fnmatch(f.lower(), pattern.lower()):
                    violations.append(f"Forbidden file pattern '{pattern}' matched: {rel_file}")
                    break

    passed = len(violations) == 0
    return passed, violations


def main():
    if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
        target_dir = Path(sys.argv[1]).resolve()
    else:
        # Default to repo_root/public
        repo_root = Path(__file__).resolve().parent.parent
        target_dir = repo_root / "public"

    print(f"[leak-guard] Scanning public root: {target_dir}")
    passed, violations = check_directory(target_dir)

    if not passed:
        print(f"[leak-guard ERROR] Security leak detected! {len(violations)} violation(s) found:")
        for v in violations:
            print(f"  - {v}")
        sys.exit(1)

    # Count clean files
    total_files = sum(len(files) for _, _, files in os.walk(target_dir))
    print(f"[leak-guard PASS] Zero leaks found. Verified {total_files} public files clean.")
    sys.exit(0)


if __name__ == "__main__":
    main()
