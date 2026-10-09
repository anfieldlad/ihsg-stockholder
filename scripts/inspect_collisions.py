#!/usr/bin/env python3
"""Check collisions in all canonical keys."""
import json
import re
from collections import defaultdict
from pathlib import Path
from normalize_investor import canonical_investor_key

def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s

def main():
    repo_root = Path(__file__).resolve().parent.parent
    path = repo_root / "public" / "shareholder_data.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", [])
    all_can = set(canonical_investor_key(it.get("investor", "")) for it in items)

    slug_map = defaultdict(list)
    for c in sorted(all_can):
        sl = slugify(c)
        slug_map[sl].append(c)

    collisions = {k: v for k, v in slug_map.items() if len(v) > 1}
    print(f"Total canonical keys: {len(all_can)}")
    print(f"Slug collisions across ALL: {len(collisions)}")
    for sl, cans in collisions.items():
        print(f"Slug '{sl}': {cans}")

    # Also check: for any single emiten, are there multiple holders with same canonical key?
    emiten_map = defaultdict(list)
    for it in items:
        emiten_map[it.get("code")].append(it)

    emiten_key_collisions = []
    for code, holders in emiten_map.items():
        seen = defaultdict(list)
        for h in holders:
            ck = canonical_investor_key(h.get("investor", ""))
            seen[ck].append(h)
        for ck, matches in seen.items():
            if len(matches) > 1:
                emiten_key_collisions.append((code, ck, [m.get("investor") for m in matches]))

    print(f"Emiten-level (emiten, key) collisions: {len(emiten_key_collisions)}")
    for c, ck, raw_list in emiten_key_collisions:
        print(f"Emiten {c}, Key '{ck}': raw={raw_list}")

if __name__ == "__main__":
    main()
