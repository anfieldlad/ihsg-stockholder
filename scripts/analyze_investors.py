#!/usr/bin/env python3
"""Analyze investor canonical keys, top-5 appearances, and collisions."""
import json
import re
from collections import defaultdict
from pathlib import Path
from normalize_investor import canonical_investor_key, normalize_investor_name

def slugify(text: str) -> str:
    """Generate URL slug from canonical investor key per SEO spec section 2:
    slug dari kunci kanonik: lowercase, ASCII, spasi -> '-', buang 'PT'/'TBK' (handled in canonical_investor_key).
    """
    s = text.lower()
    # Replace non-alphanumeric with hyphen
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s

def main():
    repo_root = Path(__file__).resolve().parent.parent
    path = repo_root / "public" / "shareholder_data.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", [])

    # Group by emiten
    emitens = defaultdict(list)
    for it in items:
        code = it.get("code")
        if code:
            emitens[code.upper()].append(it)

    # All items vs Top-5 items
    raw_investors_all = set()
    canonical_investors_all = set()
    raw_to_canonical = {}

    top5_items = []
    top5_investors_canonical = set()
    top5_investors_raw = set()
    investor_to_top5_emitens = defaultdict(list)

    for code, holders in emitens.items():
        # Sort holders by percentage or shares descending
        # Ensure consistent order
        sorted_h = sorted(holders, key=lambda x: (x.get("percentage", 0), x.get("shares", 0)), reverse=True)
        # Top 5
        t5 = sorted_h[:5]
        for rank, h in enumerate(t5, 1):
            h_copy = dict(h)
            h_copy["rank"] = rank
            h_copy["total_holders"] = len(holders)
            top5_items.append(h_copy)
            inv_raw = h.get("investor", "").strip()
            inv_can = canonical_investor_key(inv_raw)
            top5_investors_raw.add(inv_raw)
            top5_investors_canonical.add(inv_can)
            investor_to_top5_emitens[inv_can].append({
                "code": code,
                "issuer": h.get("issuer"),
                "percentage": h.get("percentage"),
                "shares": h.get("shares"),
                "rank": rank,
                "raw_name": inv_raw
            })

    for it in items:
        inv = it.get("investor", "").strip()
        raw_investors_all.add(inv)
        can = canonical_investor_key(inv)
        canonical_investors_all.add(can)
        raw_to_canonical[inv] = can

    print(f"All dataset - Raw investor strings: {len(raw_investors_all)}")
    print(f"All dataset - Canonical keys: {len(canonical_investors_all)}")
    print(f"Top-5 dataset - Total holder rows: {len(top5_items)}")
    print(f"Top-5 dataset - Unique raw investor strings: {len(top5_investors_raw)}")
    print(f"Top-5 dataset - Unique canonical investor keys: {len(top5_investors_canonical)}")

    # Check slug generation and collisions in top-5
    slug_to_canonical = defaultdict(list)
    for can in top5_investors_canonical:
        sl = slugify(can)
        slug_to_canonical[sl].append(can)

    collisions = {k: v for k, v in slug_to_canonical.items() if len(v) > 1}
    print(f"Top-5 dataset - Slug collisions: {len(collisions)}")
    for sl, cans in collisions.items():
        print(f"  Collision on slug '{sl}': {cans}")

if __name__ == "__main__":
    main()
