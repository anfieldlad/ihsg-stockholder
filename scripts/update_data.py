"""
IHSG Storm - Update Shareholder Data
======================================
Single script to check, download, and parse the latest shareholder data (>1%) from IDX/KSEI.

Since mid-2026 IDX no longer posts this file as a PDF announcement. It is published as an
Excel (.xlsx) file on the "Data Kepemilikan Saham" page:
    https://www.idx.co.id/id/perusahaan-tercatat/data-kepemilikan-saham/
as the row "Pemegang Saham di Atas 1% per <date>" (monthly, usually posted on the first
business days after month end).

Flow:
  1. Read current shareholder_data.json to check what month the data is from
  2. If data is already from last month (relative to today), skip - already latest
  3. Otherwise use Playwright to open the IDX page, find the latest "Pemegang Saham di Atas 1%"
     row and download its .xlsx
  4. Save it as scripts/shareholder_data_{MON}{YEAR}.xlsx (archive, one per month)
  5. Parse the xlsx into shareholder_data.json

IDX sits behind Cloudflare, which sometimes shows a "Just a moment..." challenge to headless
browsers. This script does not try to defeat it. If that happens, download the 1% file manually
from the page above and pass it in:

    python scripts/update_data.py --file ~/Downloads/peng-2026-09-00024-satu-persen.xlsx

Usage:
    python scripts/update_data.py                 # Check & update if needed
    python scripts/update_data.py --force         # Force download & parse even if data is current
    python scripts/update_data.py --file X.xlsx   # Skip download, parse a local xlsx

Requirements:
    pip install openpyxl playwright
    python -m playwright install chromium
"""

import argparse
import base64
import json
import os
import re
import shutil
import sys
from datetime import date, datetime

# ── Paths ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
_public_json = os.path.join(PROJECT_DIR, "public", "shareholder_data.json")
JSON_PATH = _public_json if os.path.exists(_public_json) else os.path.join(PROJECT_DIR, "shareholder_data.json")

# ── IDX page ──
PAGE_URL = "https://www.idx.co.id/id/perusahaan-tercatat/data-kepemilikan-saham/"
ROW_PREFIX = "Pemegang Saham di Atas 1%"

# Month mappings
MONTH_EN_TO_NUM = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}
MONTH_NUM_TO_EN = {v: k for k, v in MONTH_EN_TO_NUM.items()}
MONTH_NUM_TO_ID = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
    7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember",
}


# ======================================================================
# STEP 1: Check if data is already current
# ======================================================================

def get_current_data_month():
    """Read the current JSON and return the data month as (year, month) or None."""
    if not os.path.exists(JSON_PATH):
        print("[*] No existing shareholder_data.json found")
        return None

    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)

        source_date = data.get("source_date_in_file", "")
        # Format: "31-Mar-2026"
        match = re.match(r"(\d{1,2})-([A-Za-z]{3})-(\d{4})", source_date)
        if match:
            month_num = MONTH_EN_TO_NUM.get(match.group(2))
            year = int(match.group(3))
            if month_num:
                print(f"[*] Current data: {source_date} (month {month_num}/{year})")
                return (year, month_num)

        print(f"[!] Could not parse source_date: {source_date}")
        return None
    except Exception as e:
        print(f"[!] Error reading JSON: {e}")
        return None


def is_data_current(data_month):
    """Check if data is from the previous month relative to today."""
    if data_month is None:
        return False

    today = date.today()
    data_year, data_mon = data_month

    # Expected: data should be from previous month
    if today.month == 1:
        expected_year = today.year - 1
        expected_month = 12
    else:
        expected_year = today.year
        expected_month = today.month - 1

    is_current = (data_year == expected_year and data_mon == expected_month)

    if is_current:
        print(f"[OK] Data is current (expected: {expected_month}/{expected_year}, "
              f"got: {data_mon}/{data_year})")
    else:
        print(f"[*] Data needs update (expected: {expected_month}/{expected_year}, "
              f"got: {data_mon}/{data_year})")

    return is_current


# ======================================================================
# STEP 2: Download xlsx from IDX using Playwright
# ======================================================================

def fetch_and_download():
    """Open the IDX page, locate the latest 1% row and download its xlsx.

    Returns the xlsx bytes. Exits with a hint to use --file if IDX blocks the browser.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("[ERROR] Playwright not installed. Run:")
        print("        pip install playwright")
        print("        python -m playwright install chromium")
        sys.exit(1)

    print("\n[*] Launching headless browser...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                       "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        rows = []
        for attempt in range(1, 4):
            print(f"[*] Opening IDX data page (attempt {attempt}/3)...")
            page.goto(PAGE_URL, wait_until="domcontentloaded", timeout=30000)
            try:
                page.wait_for_selector("table tbody tr", timeout=20000)
            except Exception:
                print(f"    No table (page title: {page.title()!r})")
                continue
            rows = page.evaluate(
                "[...document.querySelectorAll('table tbody tr')].map(tr => ({"
                "text: tr.innerText.replace(/\\s+/g, ' ').trim(),"
                "href: (tr.querySelector('a') || {}).href || null}))"
            )
            if rows:
                break

        if not rows:
            browser.close()
            print("[ERROR] Could not load the IDX table (probably blocked by Cloudflare).")
            print("        Download the 'Pemegang Saham di Atas 1%' file manually from:")
            print(f"        {PAGE_URL}")
            print("        then run: python scripts/update_data.py --file <path-to.xlsx>")
            sys.exit(1)

        # Rows are listed newest first; take the first 1% row.
        target = next((r for r in rows if ROW_PREFIX in r["text"] and r["href"]), None)
        if not target:
            browser.close()
            print(f"[ERROR] No row starting with '{ROW_PREFIX}' on the first page of the table")
            sys.exit(1)

        print(f"[*] Latest: {target['text']}")
        print(f"[*] URL: {target['href']}")

        print("[>] Downloading xlsx...")
        try:
            b64 = page.evaluate(
                """async (u) => {
                    const r = await fetch(u);
                    if (!r.ok) throw new Error('Status: ' + r.status);
                    const a = new Uint8Array(await r.arrayBuffer());
                    let s = '';
                    for (let i = 0; i < a.length; i += 0x8000)
                        s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000));
                    return btoa(s);
                }""",
                target["href"],
            )
            data = base64.b64decode(b64)
        except Exception as e:
            print(f"[ERROR] Download failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

        print(f"[OK] Downloaded {len(data):,} bytes ({len(data) / 1024:.0f} KB)")
        return data


# ======================================================================
# STEP 3: Parse xlsx into JSON
# ======================================================================

def parse_xlsx(path):
    """Parse the KSEI >1% xlsx into shareholder_data.json. Returns the record count."""
    try:
        import openpyxl
    except ImportError:
        print("[ERROR] openpyxl not installed. Run: pip install openpyxl")
        sys.exit(1)

    print(f"\n[*] Parsing {os.path.basename(path)}...")

    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb.worksheets[0]

    columns = None
    items = []
    source_date = None

    for row in ws.iter_rows(values_only=True):
        # The sheet starts with disclaimer rows; the header row begins with DATE/SHARE_CODE.
        if columns is None:
            if row and row[0] == "DATE" and row[1] == "SHARE_CODE":
                columns = {name: i for i, name in enumerate(row) if name}
            continue

        raw_date = row[columns["DATE"]]
        code = row[columns["SHARE_CODE"]]
        if not raw_date or not code:
            continue  # blank/footer row

        date_str = _format_date(raw_date)
        items.append({
            "date": date_str,
            "code": _code(code),
            "issuer": _text(row[columns["ISSUER_NAME"]]),
            "investor": _text(row[columns["INVESTOR_NAME"]]),
            "shares": int(float(row[columns["TOTAL_HOLDING_SHARES"]] or 0)),
            "percentage": round(float(row[columns["PERCENTAGE"]] or 0.0), 2),
            "local_foreign": _text(row[columns["LOCAL_FOREIGN"]]),
            "investor_type": _text(row[columns["INVESTOR_CLASSIFICATION"]]),
        })

        if not source_date:
            source_date = date_str

    wb.close()

    if columns is None:
        print("[ERROR] Header row (DATE, SHARE_CODE, ...) not found - has the file layout changed?")
        sys.exit(1)

    as_of_label = source_date or "Unknown"
    if source_date:
        day, mon, year = _parse_date_components(source_date)
        mon_num = MONTH_EN_TO_NUM.get(mon.capitalize(), 1)
        mon_id = MONTH_NUM_TO_ID.get(mon_num, mon)
        as_of_label = f"{int(day)} {mon_id} {year}"

    output = {
        "as_of_label": as_of_label,
        "source_date_in_file": source_date or "Unknown",
        "items": items,
    }

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False)

    print(f"[OK] Extracted {len(items)} items")
    print(f"     source_date: {source_date}")
    print(f"     as_of_label: {as_of_label}")
    print(f"     Saved to: {JSON_PATH}")

    return len(items), source_date


def _parse_date_components(date_val):
    """Safely parse a date value into (day_str, mon_en_str, year_str).
    Tolerates 'DD-Mon-YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', datetime/date objects, etc.
    """
    if isinstance(date_val, (datetime, date)):
        return f"{date_val.day:02d}", MONTH_NUM_TO_EN[date_val.month], str(date_val.year)

    val_str = str(date_val).strip()

    # Match DD-Mon-YYYY or DD-MM-YYYY or with slashes (e.g. 30-Sep-2026, 30/09/2026)
    m = re.match(r"^(\d{1,2})[-/](\w{3}|\d{1,2})[-/](\d{4})$", val_str)
    if m:
        d, m_part, y = m.groups()
        if m_part.isdigit():
            m_num = int(m_part)
            mon_en = MONTH_NUM_TO_EN.get(m_num, "Jan")
        else:
            mon_en = m_part.capitalize()
        return f"{int(d):02d}", mon_en, y

    # Match YYYY-MM-DD or YYYY/MM/DD
    m = re.match(r"^(\d{4})[-/](\w{3}|\d{1,2})[-/](\d{1,2})$", val_str)
    if m:
        y, m_part, d = m.groups()
        if m_part.isdigit():
            m_num = int(m_part)
            mon_en = MONTH_NUM_TO_EN.get(m_num, "Jan")
        else:
            mon_en = m_part.capitalize()
        return f"{int(d):02d}", mon_en, y

    # Fallback splitting by punctuation
    parts = re.split(r"[-/.\s]+", val_str)
    if len(parts) >= 3:
        p0, p1, p2 = parts[0], parts[1], parts[2]
        if len(p0) == 4 and p0.isdigit():  # YYYY-MM-DD
            y, m_part, d = p0, p1, p2
        else:
            d, m_part, y = p0, p1, p2
        if m_part.isdigit():
            mon_en = MONTH_NUM_TO_EN.get(int(m_part), "Jan")
        else:
            mon_en = m_part.capitalize()
        return f"{int(d):02d}", mon_en, y

    return "01", "Jan", "2026"


def _format_date(value):
    """Return a date cell as 'DD-Mon-YYYY' (e.g. '30-Sep-2026')."""
    if isinstance(value, (datetime, date)):
        return f"{value.day:02d}-{MONTH_NUM_TO_EN[value.month]}-{value.year}"
    val_str = str(value).strip()
    try:
        d, m, y = _parse_date_components(val_str)
        return f"{d}-{m}-{y}"
    except Exception:
        return val_str


def _code(value):
    """Share code as text. Excel stores the ticker TRUE as a boolean cell."""
    if isinstance(value, bool):
        return str(value).upper()
    return str(value).strip()


def _text(value):
    return "" if value is None else str(value).strip()


def archive_xlsx(src_bytes_or_path, source_date):
    """Store the xlsx as scripts/shareholder_data_{MON}{YEAR}.xlsx."""
    day, mon, year = _parse_date_components(source_date)
    dest = os.path.join(SCRIPT_DIR, f"shareholder_data_{mon.upper()}{year}.xlsx")
    if isinstance(src_bytes_or_path, bytes):
        with open(dest, "wb") as f:
            f.write(src_bytes_or_path)
    elif os.path.abspath(src_bytes_or_path) != dest:
        shutil.copyfile(src_bytes_or_path, dest)
    print(f"[OK] Archived source as {os.path.relpath(dest, PROJECT_DIR)}")


# ======================================================================
# MAIN
# ======================================================================

def main():
    parser = argparse.ArgumentParser(
        description="IHSG Storm - Check, download & parse latest shareholder data from IDX/KSEI"
    )
    parser.add_argument("--force", action="store_true",
                        help="Force update even if data appears current")
    parser.add_argument("--file", metavar="XLSX",
                        help="Parse this local 'Pemegang Saham di Atas 1%%' xlsx instead of downloading")
    args = parser.parse_args()

    print("=" * 60)
    print("  IHSG Storm - Shareholder Data Updater")
    print("=" * 60)
    print()

    if args.file:
        source = os.path.expanduser(args.file)
        if not os.path.isfile(source):
            print(f"[ERROR] File not found: {source}")
            sys.exit(1)
    else:
        data_month = get_current_data_month()
        if not args.force and is_data_current(data_month):
            print("\n[DONE] Data is already up to date. Use --force to re-download.")
            return

        print("\n" + "-" * 60)
        print("  Downloading from IDX...")
        print("-" * 60)
        source = fetch_and_download()

    # Parse (from a temp copy when we only have bytes)
    if isinstance(source, bytes):
        tmp_path = os.path.join(SCRIPT_DIR, ".download.xlsx")
        with open(tmp_path, "wb") as f:
            f.write(source)
        parse_path = tmp_path
    else:
        parse_path = source

    print("\n" + "-" * 60)
    print("  Parsing xlsx...")
    print("-" * 60)
    try:
        count, source_date = parse_xlsx(parse_path)
    finally:
        if isinstance(source, bytes) and os.path.exists(parse_path):
            os.remove(parse_path)

    if count > 0 and source_date:
        archive_xlsx(source, source_date)

    print("\n" + "=" * 60)
    if count > 0:
        print(f"  [DONE] Successfully updated with {count:,} records!")
    else:
        print("  [WARN] Parse completed but no records found.")
    print("=" * 60)


if __name__ == "__main__":
    main()
