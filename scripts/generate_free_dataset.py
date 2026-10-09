#!/usr/bin/env python3
"""scripts/generate_free_dataset.py — Generate top-5-only free dataset.

Enforces D10 / SEC-01 Toby:
- Strips all holders past rank 5.
- Writes to data/free/shareholder_top5.json (strictly OUTSIDE public/).
- Retains total_holders count for lock card display without exposing rows > 5.
"""
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from scripts.normalize_investor import normalize_investor_name, canonical_investor_key


def generate_top5_dataset(
    source_path: Path, output_path: Path, max_rank: int = 5
) -> dict:
    """Generate free-tier dataset containing strictly top-N holders per emiten."""
    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_path}")

    with open(source_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    raw_items = data.get("items", [])
    as_of_label = data.get("as_of_label", "30 September 2026")
    source_date = data.get("source_date_in_file", "30-Sep-2026")

    # Group items by emiten code
    emitens = defaultdict(list)
    for item in raw_items:
        code = (item.get("code") or "").strip().upper()
        if code:
            emitens[code].append(item)

    free_items = []
    emiten_summaries = {}

    for code, holders in sorted(emitens.items()):
        # Sort holders by percentage descending, then shares descending
        sorted_holders = sorted(
            holders,
            key=lambda x: (
                float(x.get("percentage") or 0),
                int(x.get("shares") or 0),
            ),
            reverse=True,
        )

        total_holders = len(sorted_holders)
        top_slice = sorted_holders[:max_rank]

        emiten_holders = []
        issuer_name = sorted_holders[0].get("issuer", "").strip()

        for rank, h in enumerate(top_slice, 1):
            inv_raw = (h.get("investor") or "").strip()
            inv_norm = normalize_investor_name(inv_raw)
            inv_can = canonical_investor_key(inv_raw)

            row = {
                "date": h.get("date", source_date),
                "code": code,
                "issuer": h.get("issuer", issuer_name),
                "investor": inv_raw,
                "investor_normalized": inv_norm,
                "investor_canonical": inv_can,
                "shares": int(h.get("shares") or 0),
                "percentage": float(h.get("percentage") or 0),
                "local_foreign": h.get("local_foreign", "L"),
                "investor_type": h.get("investor_type", ""),
                "rank": rank,
                "total_holders": total_holders,
            }
            free_items.append(row)
            emiten_holders.append(row)

        emiten_summaries[code] = {
            "code": code,
            "issuer": issuer_name,
            "total_holders": total_holders,
            "top_holders_count": len(emiten_holders),
            "hidden_holders_count": max(0, total_holders - len(emiten_holders)),
        }

    dataset = {
        "as_of_label": as_of_label,
        "source_date_in_file": source_date,
        "tier": "free",
        "max_rank": max_rank,
        "total_emitens": len(emitens),
        "total_rows": len(free_items),
        "emiten_summaries": emiten_summaries,
        "items": free_items,
    }

    # Verify security contract: zero rows with rank > max_rank
    for item in free_items:
        if item["rank"] > max_rank:
            raise ValueError(f"SEC-01 Violation: holder row with rank {item['rank']} > {max_rank}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    return dataset


def main():
    repo_root = REPO_ROOT
    source = repo_root / "public" / "shareholder_data.json"
    output = repo_root / "data" / "free" / "shareholder_top5.json"

    # Ensure output is OUTSIDE public/
    try:
        output.relative_to(repo_root / "public")
        print("[ERROR] Output path cannot be inside public/", file=sys.stderr)
        sys.exit(1)
    except ValueError:
        pass  # Good, it is outside public/

    print(f"Generating top-5 free dataset from {source} -> {output}...")
    dataset = generate_top5_dataset(source, output, max_rank=5)
    print(
        f"[SUCCESS] Generated free dataset: {dataset['total_emitens']} emitens, "
        f"{dataset['total_rows']} total rows (max rank {dataset['max_rank']})."
    )


if __name__ == "__main__":
    main()
