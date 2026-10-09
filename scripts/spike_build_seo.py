#!/usr/bin/env python3
"""scripts/spike_build_seo.py — Static pre-renderer for IHSG SEO Phase 1 Spike (Option A).

Per Section 10 of seo-technical-options.md:
- Reads top-5 free dataset from path OUTSIDE public/ (strictly refuses rank > 5).
- SITE_URL sourced from site_config.py / env var.
- Renders 961 stock pages + 20 sample investor pages + indexes + sitemaps.
- Produces output in dist-spike/ (outside public/).
"""
import json
import os
import re
import shutil
import sys
import time
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

import site_config
from scripts.normalize_investor import canonical_investor_key
from scripts.spike_templates import (
    generate_sitemaps,
    render_investor_index,
    render_investor_page,
    render_saham_index,
    render_stock_page,
)


def get_site_url() -> str:
    """Return single-constant production host URL without trailing slash."""
    url = os.environ.get("SITE_URL") or getattr(site_config, "SITE_URL", "")
    return url.rstrip("/")


def slugify_canonical_key(text: str) -> str:
    """Generate ASCII hyphenated slug from canonical investor key."""
    s = text.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "investor"


def build_investor_slug_registry(canonical_keys: set) -> dict:
    """Map canonical investor key -> unique URL slug, resolving any collisions with -2, etc."""
    slug_to_key = {}
    key_to_slug = {}
    for key in sorted(canonical_keys):
        base_slug = slugify_canonical_key(key)
        slug = base_slug
        counter = 2
        while slug in slug_to_key and slug_to_key[slug] != key:
            slug = f"{base_slug}-{counter}"
            counter += 1
        slug_to_key[slug] = key
        key_to_slug[key] = slug
    return key_to_slug


def validate_free_dataset_security(dataset_path: Path, repo_root: Path) -> dict:
    """Enforce SEC-01 Toby / D10: Refuse input inside public/ or containing rank > 5."""
    resolved_path = dataset_path.resolve()
    public_path = (repo_root / "public").resolve()
    try:
        resolved_path.relative_to(public_path)
        raise ValueError(f"SECURITY REFUSAL: Input dataset {resolved_path} is inside public/!")
    except ValueError as e:
        if "is inside public/!" in str(e):
            raise

    with open(resolved_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", [])
    if not items:
        raise ValueError("Input dataset contains no items.")

    emiten_ranks = defaultdict(list)
    for idx, item in enumerate(items):
        rank = item.get("rank")
        if rank is None or not isinstance(rank, int) or rank > 5 or rank < 1:
            raise ValueError(
                f"SECURITY REFUSAL (D10 / SEC-01): Row {idx} ({item.get('code')}) "
                f"has illegal holder rank '{rank}' (strictly max rank 5 allowed)!"
            )
        emiten_ranks[item.get("code")].append(rank)

    for code, ranks in emiten_ranks.items():
        if len(ranks) > 5:
            raise ValueError(
                f"SECURITY REFUSAL (D10): Emiten {code} has {len(ranks)} holder rows (> 5 allowed)!"
            )

    return data


def build_seo_spike(dataset_path: Path, out_dir: Path, sample_investor_count: int = 20) -> dict:
    """Build 961 stock pages + sample investor pages + sitemaps into out_dir."""
    t0 = time.time()
    site_url = get_site_url()
    repo_root = REPO_ROOT

    # 1. Enforce D10 / SEC-01 security checks
    data = validate_free_dataset_security(dataset_path, repo_root)
    as_of_label = data.get("as_of_label", "30 September 2026")
    items = data.get("items", [])
    summaries = data.get("emiten_summaries", {})

    emitens_holders = defaultdict(list)
    investor_to_holdings = defaultdict(list)
    all_canonical_keys = set()

    for item in items:
        code = item["code"].upper()
        emitens_holders[code].append(item)
        can_key = item.get("investor_canonical") or canonical_investor_key(item.get("investor", ""))
        all_canonical_keys.add(can_key)
        investor_to_holdings[can_key].append(item)

    slug_map = build_investor_slug_registry(all_canonical_keys)

    # 2. Prepare output directory
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "saham").mkdir(parents=True, exist_ok=True)
    (out_dir / "investor").mkdir(parents=True, exist_ok=True)

    # 3. Render 961 stock pages
    stock_pages_written = 0
    emiten_list = []
    for code, holders in sorted(emitens_holders.items()):
        summary = summaries.get(code, {
            "code": code,
            "issuer": holders[0].get("issuer", code),
            "total_holders": len(holders),
        })
        emiten_list.append(summary)
        page_html = render_stock_page(code, summary, holders, as_of_label, site_url, slug_map)
        code_dir = out_dir / "saham" / code.lower()
        code_dir.mkdir(parents=True, exist_ok=True)
        (code_dir / "index.html").write_text(page_html, encoding="utf-8")
        stock_pages_written += 1

    saham_index_html = render_saham_index(emiten_list, as_of_label, site_url)
    (out_dir / "saham" / "index.html").write_text(saham_index_html, encoding="utf-8")

    # 4. Render sample investor pages
    sorted_inv = sorted(
        investor_to_holdings.items(),
        key=lambda x: (len(x[1]), x[0]),
        reverse=True,
    )
    collision_keys = {"GESIT PERKASA", "KRESNA PRIMA INVEST", "DINASTI KREATIF INDONESIA", "WALDEN GLOBAL SERVICES"}
    selected_keys = []
    for ck in collision_keys:
        if ck in investor_to_holdings:
            selected_keys.append(ck)
    for k, holdings in sorted_inv:
        if k not in selected_keys and len(selected_keys) < sample_investor_count:
            selected_keys.append(k)

    sample_investor_list = []
    for key in selected_keys:
        holdings = investor_to_holdings[key]
        slug = slug_map[key]
        inv_dir = out_dir / "investor" / slug
        inv_dir.mkdir(parents=True, exist_ok=True)
        page_html = render_investor_page(key, holdings, as_of_label, site_url, slug)
        (inv_dir / "index.html").write_text(page_html, encoding="utf-8")
        sample_investor_list.append({
            "canonical_key": key,
            "name": holdings[0].get("raw_name") or holdings[0].get("investor", key),
            "count": len(holdings),
            "slug": slug,
        })

    inv_index_html = render_investor_index(sample_investor_list, slug_map, as_of_label, site_url)
    (out_dir / "investor" / "index.html").write_text(inv_index_html, encoding="utf-8")

    # 5. Sitemaps
    generate_sitemaps(emiten_list, sample_investor_list, slug_map, site_url, out_dir)

    # 6. Copy static assets from public/ into out_dir for local preview server
    public_dir = repo_root / "public"
    for item_name in ["assets", "favicon.svg", "favicon-32.png", "favicon-192.png", "favicon-512.png", "favicon.ico", "apple-touch-icon.png", "og-image.png"]:
        src = public_dir / item_name
        dst = out_dir / item_name
        if src.exists():
            if src.is_dir():
                shutil.copytree(src, dst, dirs_exist_ok=True)
            else:
                shutil.copy2(src, dst)

    elapsed = time.time() - t0

    all_files = [p for p in out_dir.rglob("*") if p.is_file()]
    total_size = sum(p.stat().st_size for p in all_files)
    html_files = [p for p in out_dir.rglob("*.html") if p.is_file()]
    max_html = max(html_files, key=lambda p: p.stat().st_size) if html_files else None

    return {
        "build_time_seconds": round(elapsed, 3),
        "stock_pages_count": stock_pages_written,
        "investor_pages_count": len(sample_investor_list),
        "total_files_count": len(all_files),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "max_html_file": str(max_html.relative_to(out_dir)) if max_html else None,
        "max_html_size_bytes": max_html.stat().st_size if max_html else 0,
        "unique_top5_investors": len(all_canonical_keys),
    }


def main():
    repo_root = REPO_ROOT
    dataset = repo_root / "data" / "free" / "shareholder_top5.json"
    dist_dir = repo_root / "dist-spike"

    print(f"Building SEO Phase 1 Spike into {dist_dir}...")
    stats = build_seo_spike(dataset, dist_dir, sample_investor_count=20)
    print("=== SPIKE BUILD METRICS ===")
    print(f"Build duration       : {stats['build_time_seconds']} s")
    print(f"Stock pages built    : {stats['stock_pages_count']}")
    print(f"Investor pages built : {stats['investor_pages_count']}")
    print(f"Total files written  : {stats['total_files_count']}")
    print(f"Total directory size : {stats['total_size_mb']} MB ({stats['total_size_bytes']} bytes)")
    print(f"Largest HTML page    : {stats['max_html_file']} ({stats['max_html_size_bytes']} bytes)")
    print(f"Top-5 Unique Investors: {stats['unique_top5_investors']}")


if __name__ == "__main__":
    main()
