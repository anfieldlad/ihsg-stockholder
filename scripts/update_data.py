"""
IHSG Storm - Update Shareholder Data
======================================
Single script to check, download, and parse the latest shareholder data from IDX/KSEI.

Flow:
  1. Read current shareholder_data.json to check what month the data is from
  2. If data is already from last month (relative to today), skip - already latest
  3. If not latest, use Playwright (headless browser) to bypass Cloudflare and:
     a. Fetch the IDX announcement API for latest shareholder PDF
     b. Download the PDF attachment
  4. Rename old shareholder_data.pdf to shareholder_data_{MONTH}{YEAR}.pdf as archive
  5. Save new PDF as shareholder_data.pdf
  6. Parse the PDF into shareholder_data.json using parse_pdf logic

Usage:
    python scripts/update_data.py           # Check & update if needed
    python scripts/update_data.py --force   # Force download & parse even if data is current

Requirements:
    pip install pdfplumber playwright
    python -m playwright install chromium
"""

import json
import os
import sys
import re
import argparse
from datetime import datetime, date

# ── Paths ──
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
JSON_PATH = os.path.join(PROJECT_DIR, "shareholder_data.json")
PDF_PATH = os.path.join(SCRIPT_DIR, "shareholder_data.pdf")

# ── IDX API ──
API_URL = "https://www.idx.co.id/primary/NewsAnnouncement/GetAllAnnouncement"
SEARCH_KEYWORDS = "Pemegang Saham di atas 1% (KSEI) [Semua Emiten Saham ]"

# Month mappings
MONTH_EN_TO_NUM = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12,
}
MONTH_NUM_TO_ID = {
    1: "Januari", 2: "Februari", 3: "Maret", 4: "April", 5: "Mei", 6: "Juni",
    7: "Juli", 8: "Agustus", 9: "September", 10: "Oktober", 11: "November", 12: "Desember",
}
MONTH_NUM_TO_SHORT = {
    1: "JAN", 2: "FEB", 3: "MAR", 4: "APR", 5: "MAY", 6: "JUN",
    7: "JUL", 8: "AUG", 9: "SEP", 10: "OCT", 11: "NOV", 12: "DEC",
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
# STEP 2: Download PDF from IDX using Playwright
# ======================================================================

def fetch_and_download():
    """Use Playwright to bypass Cloudflare, fetch API, and download PDF."""
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

        # First visit IDX to get Cloudflare cookies
        print("[*] Visiting IDX to establish session...")
        page.goto("https://www.idx.co.id/id/berita/pengumuman/", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)  # Let Cloudflare resolve

        # Now call the API
        print(f"[*] Fetching announcement API...")
        api_url = (
            f"{API_URL}?"
            f"keywords={SEARCH_KEYWORDS.replace(' ', '+').replace('%', '%25').replace('[', '%5B').replace(']', '%5D')}"
            f"&pageNumber=1&pageSize=5&lang=id"
        )

        response = page.goto(api_url, wait_until="domcontentloaded", timeout=15000)

        if response.status != 200:
            print(f"[ERROR] API returned status {response.status}")
            browser.close()
            sys.exit(1)

        body = page.inner_text("body")
        data = json.loads(body)

        items = data.get("Items", [])
        total = data.get("ItemCount", 0)
        print(f"[*] Found {total} announcement(s)")

        if not items:
            print("[ERROR] No announcements found")
            browser.close()
            sys.exit(1)

        # Find attachment in latest item
        item = items[0]
        title = item.get("Title", "Unknown")
        pub_date = item.get("PublishDate", "")
        print(f"[*] Latest: {title}")
        print(f"    Published: {pub_date}")

        att_url, att_name = _find_attachment(item)
        if not att_url:
            print("[ERROR] No attachment found in announcement")
            browser.close()
            sys.exit(1)

        print(f"[*] Attachment: {att_name}")
        print(f"[*] URL: {att_url}")

        # Download the PDF via browser-native fetch to bypass CF & navigation issues
        print("[>] Downloading PDF...")
        try:
            js = f"""
            async () => {{
                const resp = await fetch("{att_url}");
                if (!resp.ok) throw new Error("Status: " + resp.status);
                const buffer = await resp.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let binary = '';
                for (let i = 0; i < bytes.byteLength; i++) {{
                    binary += String.fromCharCode(bytes[i]);
                }}
                return window.btoa(binary);
            }}
            """
            pdf_base64 = page.evaluate(js)
            import base64
            pdf_bytes = base64.b64decode(pdf_base64)
            
        except Exception as e:
            print(f"[ERROR] Download failed: {e}")
            browser.close()
            sys.exit(1)
        browser.close()

        print(f"[OK] Downloaded {len(pdf_bytes):,} bytes ({len(pdf_bytes) / 1024 / 1024:.1f} MB)")
        return pdf_bytes


def _find_attachment(item):
    """Extract the lampiran PDF URL from an announcement item."""
    attachments = item.get("Attachments", [])

    if not attachments and item.get("PdfPath"):
        try:
            attachments = json.loads(item["PdfPath"])
        except (json.JSONDecodeError, TypeError):
            pass

    if not attachments:
        return None, None

    # Prefer IsAttachment=1 (lampiran)
    for att in attachments:
        if att.get("IsAttachment") == 1:
            return att.get("FullSavePath"), att.get("OriginalFilename", "attachment.pdf")

    # Fallback: look for "lamp" in filename
    for att in attachments:
        filename = att.get("OriginalFilename", "")
        if "lamp" in filename.lower():
            return att.get("FullSavePath"), filename

    # Last resort
    att = attachments[0]
    return att.get("FullSavePath"), att.get("OriginalFilename", "attachment.pdf")


# ======================================================================
# STEP 3: Archive old PDF & save new one
# ======================================================================

def archive_and_save(pdf_bytes):
    """Rename old shareholder_data.pdf to include month label, save new one."""
    # Archive old PDF if it exists
    if os.path.exists(PDF_PATH):
        old_month = get_current_data_month()
        if old_month:
            year, month = old_month
            short = MONTH_NUM_TO_SHORT.get(month, f"M{month}")
            archive_name = f"shareholder_data_{short}{year}.pdf"
        else:
            archive_name = f"shareholder_data_old_{datetime.now().strftime('%Y%m%d')}.pdf"

        archive_path = os.path.join(SCRIPT_DIR, archive_name)

        # Don't overwrite existing archive
        if os.path.exists(archive_path):
            print(f"[*] Archive already exists: {archive_name}")
        else:
            os.rename(PDF_PATH, archive_path)
            print(f"[*] Archived old PDF as: {archive_name}")

    # Save new PDF
    with open(PDF_PATH, "wb") as f:
        f.write(pdf_bytes)

    file_size = os.path.getsize(PDF_PATH)
    print(f"[OK] Saved new shareholder_data.pdf ({file_size:,} bytes)")


# ======================================================================
# STEP 4: Parse PDF into JSON (inline from parse_pdf.py logic)
# ======================================================================

# Column layout (left-edge x ranges in PDF points). The IDX/KSEI PDFs render
# as positioned text without ruled table lines, so we bucket each word into a
# column by its x0 coordinate. The date and share code are rendered glued
# together as a single token (e.g. "29-May-2026ALTO"), split via DATE_RE below.
#   DATE+CODE | ISSUER | INVESTOR | CLASSIFICATION | LOCAL/FOREIGN |
#   NATIONALITY+DOMICILE | SCRIPLESS | SCRIP | TOTAL_HOLDING | PERCENTAGE
COLUMN_BOUNDS = [
    ("code", 0, 90),
    ("issuer", 90, 145),
    ("investor", 145, 270),
    ("investor_type", 270, 328),
    ("local_foreign", 328, 345),
    ("natdom", 345, 430),   # nationality + domicile (not exported)
    ("scripless", 430, 472),  # holdings scripless (not exported)
    ("scrip", 472, 500),      # holdings scrip (not exported)
    ("shares", 500, 535),     # total holding shares
    ("percentage", 535, 99999),
]
DATE_CODE_RE = re.compile(r'^(\d{1,2}-[A-Za-z]{3}-\d{4})(.*)$')

# When an issuer name is long, the source PDF glues the start of the investor
# name directly onto the issuer's "Tbk" suffix as a single token with no space
# (e.g. "TbkDRS.JOHNNY", "TbkKINGSWOOD"), which lands in the issuer column. All
# listed-company issuers end in "Tbk", so split such a token: the part up to and
# including "Tbk" is the issuer, the trailing capitalised remainder is the start
# of the investor name. The [A-Z] guard avoids splitting legitimate endings like
# "Tbk," (trailing comma).
ISSUER_INVESTOR_SPLIT_RE = re.compile(r'^(.*Tbk)([A-Z].*)$')

# Likewise, a long investor-classification (e.g. "...Limited Partnership") can
# overflow rightward and glue the single-letter Local/Foreign flag onto its last
# word as one token (e.g. "PartnershipL", "PartnershipF"). Split off a trailing
# capital L/F that follows a lowercase letter — no real classification word ends
# that way, so this only fires on the glued case.
TYPE_LF_SPLIT_RE = re.compile(r'^(.*[a-z])([LF])$')


def _column_for(x0):
    """Return the column name whose x-range contains x0, or None."""
    for name, lo, hi in COLUMN_BOUNDS:
        if lo <= x0 < hi:
            return name
    return None


def parse_pdf():
    """Parse shareholder_data.pdf into shareholder_data.json."""
    try:
        import pdfplumber
    except ImportError:
        print("[ERROR] pdfplumber not installed. Run: pip install pdfplumber")
        sys.exit(1)

    print("\n[*] Parsing PDF...")

    items = []
    source_date = None

    with pdfplumber.open(PDF_PATH) as pdf:
        for page in pdf.pages:
            # Group words into rows by their vertical position, then bucket
            # each word into a column by its x0 coordinate.
            rows = {}
            for w in page.extract_words():
                rows.setdefault(round(w["top"]), []).append(w)

            for top in sorted(rows):
                cells = {}
                for w in sorted(rows[top], key=lambda w: w["x0"]):
                    col = _column_for(w["x0"])
                    if not col:
                        continue
                    text = w["text"]
                    # Recover an investor name glued onto the issuer's "Tbk" suffix.
                    if col == "issuer":
                        split = ISSUER_INVESTOR_SPLIT_RE.match(text)
                        if split:
                            cells.setdefault("issuer", []).append(split.group(1))
                            cells.setdefault("investor", []).append(split.group(2))
                            continue
                    # Recover a Local/Foreign flag glued onto a long classification.
                    if col == "investor_type":
                        split = TYPE_LF_SPLIT_RE.match(text)
                        if split:
                            cells.setdefault("investor_type", []).append(split.group(1))
                            cells.setdefault("local_foreign", []).append(split.group(2))
                            continue
                    cells.setdefault(col, []).append(text)

                code_raw = " ".join(cells.get("code", []))
                match = DATE_CODE_RE.match(code_raw)
                if not match:
                    continue  # not a data row (header, blank, etc.)

                date_str = match.group(1)
                share_code = match.group(2).strip()

                issuer = " ".join(cells.get("issuer", []))
                investor = " ".join(cells.get("investor", []))
                investor_type = " ".join(cells.get("investor_type", []))
                local_foreign = " ".join(cells.get("local_foreign", []))

                shares = _clean_number(" ".join(cells.get("shares", [])))
                percentage = _clean_float(" ".join(cells.get("percentage", [])))

                items.append({
                    "date": date_str,
                    "code": share_code,
                    "issuer": issuer,
                    "investor": investor,
                    "shares": shares,
                    "percentage": percentage,
                    "local_foreign": local_foreign,
                    "investor_type": investor_type,
                })

                if not source_date:
                    source_date = date_str

    # Generate as_of_label
    as_of_label = source_date or "Unknown"
    if source_date:
        try:
            parts = source_date.split("-")
            day = int(parts[0])
            month_num = MONTH_EN_TO_NUM.get(parts[1])
            month_id = MONTH_NUM_TO_ID.get(month_num, parts[1])
            year = parts[2]
            as_of_label = f"{day} {month_id} {year}"
        except (IndexError, ValueError):
            as_of_label = source_date

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

    return len(items)


def _clean_number(s):
    if not s:
        return 0
    try:
        return int(s.replace('.', '').strip())
    except ValueError:
        return 0


def _clean_float(s):
    if not s:
        return 0.0
    try:
        return float(s.replace(',', '.').strip())
    except ValueError:
        return 0.0


# ======================================================================
# MAIN
# ======================================================================

def main():
    parser = argparse.ArgumentParser(
        description="IHSG Storm - Check, download & parse latest shareholder data from IDX/KSEI"
    )
    parser.add_argument("--force", action="store_true",
                        help="Force update even if data appears current")
    args = parser.parse_args()

    print("=" * 60)
    print("  IHSG Storm - Shareholder Data Updater")
    print("=" * 60)
    print()

    # Step 1: Check if update is needed
    data_month = get_current_data_month()

    if not args.force and is_data_current(data_month):
        print("\n[DONE] Data is already up to date. Use --force to re-download.")
        return

    # Step 2: Download from IDX
    print("\n" + "-" * 60)
    print("  Downloading from IDX...")
    print("-" * 60)
    pdf_bytes = fetch_and_download()

    # Step 3: Archive old & save new
    print("\n" + "-" * 60)
    print("  Saving PDF...")
    print("-" * 60)
    archive_and_save(pdf_bytes)

    # Step 4: Parse PDF into JSON
    print("\n" + "-" * 60)
    print("  Parsing PDF...")
    print("-" * 60)
    count = parse_pdf()

    # Summary
    print("\n" + "=" * 60)
    if count > 0:
        print(f"  [DONE] Successfully updated with {count:,} records!")
    else:
        print("  [WARN] Parse completed but no records found.")
    print("=" * 60)


if __name__ == "__main__":
    main()
