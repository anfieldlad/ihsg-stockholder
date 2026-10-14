"""Regression guard: worker.js uses env.<NAME>.fetch, wrangler.json must bind that name.

Without assets.binding the Worker throws (Cloudflare 1101) on every URL that
is not an existing static file.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _assets():
    return json.loads((ROOT / "wrangler.json").read_text(encoding="utf-8"))["assets"]


def test_assets_binding_is_declared():
    assert _assets().get("binding") == "ASSETS"


def test_worker_env_binding_matches_config():
    src = (ROOT / "worker.js").read_text(encoding="utf-8")
    names = set(re.findall(r"env\.([A-Z_]+)\.fetch\(", src))
    assert names == {_assets()["binding"]}


def test_assets_directory_unchanged():
    assert _assets()["directory"] == "./public"
