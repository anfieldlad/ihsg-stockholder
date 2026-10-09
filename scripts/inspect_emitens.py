#!/usr/bin/env python3
"""Inspect emiten and holder counts in shareholder_data.json."""
import json
from collections import defaultdict
from pathlib import Path

def main():
    repo_root = Path(__file__).resolve().parent.parent
    path = repo_root / "public" / "shareholder_data.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", [])
    emitens = defaultdict(list)
    for it in items:
        code = it.get("code")
        if code:
            emitens[code.upper()].append(it)

    print(f"Total distinct emitens: {len(emitens)}")
    
    # Sort holders within each emiten by percentage/shares descending
    counts = [len(holders) for holders in emitens.values()]
    over_5 = sum(1 for c in counts if c > 5)
    le_5 = sum(1 for c in counts if c <= 5)
    print(f"Emitens with >5 holders: {over_5}")
    print(f"Emitens with <=5 holders: {le_5}")
    print(f"Max holders for single emiten: {max(counts) if counts else 0}")
    print(f"Min holders for single emiten: {min(counts) if counts else 0}")

    over_5_examples = [(code, len(h)) for code, h in emitens.items() if len(h) > 5][:10]
    print(f"Sample emitens with >5 holders: {over_5_examples}")

if __name__ == "__main__":
    main()
