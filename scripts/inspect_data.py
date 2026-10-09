#!/usr/bin/env python3
"""Inspect shareholder data structure."""
import json

def main():
    path = "/home/dioriza/projects/ihsg-stockholder/public/shareholder_data.json"
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    print("Top-level keys:", list(data.keys()))
    print("as_of_label:", data.get("as_of_label"))
    print("source_date_in_file:", data.get("source_date_in_file"))
    items = data.get("items", [])
    print(f"Total items: {len(items)}")
    if items:
        print("Sample item keys:", list(items[0].keys()))
        print("Sample item 0:", json.dumps(items[0], indent=2)[:500])

if __name__ == "__main__":
    main()
