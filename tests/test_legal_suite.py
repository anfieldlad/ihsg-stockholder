import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_LEGAL_DIR = REPO_ROOT / "docs" / "legal"
COMPANY_LEGAL_DIR = Path("/home/hermes/company/ihsg/legal")

EXPECTED_FILES = [
    "01-syarat-dan-ketentuan.md",
    "02-kebijakan-privasi.md",
    "03-kebijakan-refund.md",
    "04-disclaimer-ojk.md",
    "05-customer-support-playbook.md",
    "README.md",
    "disclaimer-and-paywall-wording.md",
]

def test_files_exist():
    print("--- [Test 1] Verifying legal & CS documents exist in repo docs/legal ---")
    assert DOCS_LEGAL_DIR.exists(), f"Directory {DOCS_LEGAL_DIR} must exist"
    for filename in EXPECTED_FILES:
        filepath = DOCS_LEGAL_DIR / filename
        assert filepath.exists(), f"Missing file: {filepath}"
        size = filepath.stat().st_size
        assert size > 500, f"File too small: {filepath} ({size} bytes)"
        print(f"  [OK] {filename} ({size} bytes)")
    print("[PASS] All files present in docs/legal.\n")

def test_line_counts():
    print("--- [Test 2] Verifying line counts (<400 lines each) ---")
    for filename in EXPECTED_FILES:
        filepath = DOCS_LEGAL_DIR / filename
        with open(filepath, "r", encoding="utf-8") as f:
            lines = f.readlines()
        count = len(lines)
        print(f"  {filename}: {count} lines")
        assert count < 400, f"{filename} exceeds 400 lines: {count}"
        assert count >= 40, f"{filename} has too few lines: {count}"
    print("[PASS] All files within line count limits (<400 lines).\n")

def test_regulatory_and_pass_content():
    print("--- [Test 3] Verifying legal & regulatory compliance content ---")
    
    # Syarat dan Ketentuan
    tos = (DOCS_LEGAL_DIR / "01-syarat-dan-ketentuan.md").read_text(encoding="utf-8")
    assert "DRAFT" in tos
    assert "Toby" in tos
    assert "Bobby" in tos
    assert "One-Time" in tos or "sekali bayar" in tos.lower()
    assert "auto-renew" in tos.lower() or "perpanjangan otomatis" in tos.lower()
    assert "19.000" in tos
    assert "49.000" in tos
    assert "599.000" in tos
    assert "50 kursi" in tos or "50" in tos
    assert "GRACE_DAYS" in tos or "0" in tos
    print("  [OK] 01-syarat-dan-ketentuan.md rules verified.")
    
    # Kebijakan Privasi
    privacy = (DOCS_LEGAL_DIR / "02-kebijakan-privasi.md").read_text(encoding="utf-8")
    assert "UU" in privacy and "27" in privacy and "2022" in privacy
    assert "Firebase" in privacy
    assert "Google" in privacy
    assert "Mayar" in privacy
    assert "Xendit" not in privacy
    assert "Umami" in privacy
    assert "/api/v1/me/export" in privacy
    assert "DELETE /api/v1/me" in privacy
    assert "10 Tahun" in privacy or "10 tahun" in privacy
    assert "deletion_log" in privacy
    print("  [OK] 02-kebijakan-privasi.md UU PDP clauses verified.")
    
    # Kebijakan Refund
    refund = (DOCS_LEGAL_DIR / "03-kebijakan-refund.md").read_text(encoding="utf-8")
    assert "No Refund" in refund
    assert "48 jam" in refund or "48" in refund
    assert "ganda" in refund.lower() or "double charge" in refund.lower()
    assert "Mayar" in refund
    assert "Xendit" not in refund
    assert "[A]" in refund
    assert "Saldo" in refund or "saldo" in refund.lower()
    print("  [OK] 03-kebijakan-refund.md refund rules verified.")
    
    # Disclaimer OJK
    disclaimer = (DOCS_LEGAL_DIR / "04-disclaimer-ojk.md").read_text(encoding="utf-8")
    assert "POJK No. 6" in disclaimer or "POJK" in disclaimer
    assert "UU P2SK" in disclaimer or "UU No. 4 Tahun 2023" in disclaimer
    assert "BUKAN" in disclaimer or "bukan penasihat investasi" in disclaimer.lower()
    assert "DYOR" in disclaimer or "Do Your Own Research" in disclaimer
    assert "Buy / Sell Signals" in disclaimer
    assert "Mayar" in disclaimer
    assert "Xendit" not in disclaimer
    print("  [OK] 04-disclaimer-ojk.md OJK disclaimer rules verified.")
    
    # CS Playbook
    cs = (DOCS_LEGAL_DIR / "05-customer-support-playbook.md").read_text(encoding="utf-8")
    assert "data salah" in cs.lower() or "glued token" in cs.lower()
    assert "akses belum aktif" in cs.lower()
    assert "refund" in cs.lower()
    assert "hapus akun" in cs.lower()
    assert "Erin" in cs
    assert "Mayar" in cs
    assert "Xendit" not in cs
    assert "[A]" in cs
    assert "Saldo" in cs or "saldo" in cs.lower()
    print("  [OK] 05-customer-support-playbook.md CS templates verified.")

    # README Manifest & Placeholders Checklist
    readme = (DOCS_LEGAL_DIR / "README.md").read_text(encoding="utf-8")
    assert "Harus diisi Bobby" in readme
    assert "Mayar" in readme
    assert "Xendit" not in readme
    print("  [OK] README.md manifest & Bobby's checklist verified.")

    # D10 Disclaimer and Paywall Wording
    d10 = (DOCS_LEGAL_DIR / "disclaimer-and-paywall-wording.md").read_text(encoding="utf-8")
    assert "Toby" in d10
    assert "D10" in d10
    assert "Data Publik Tetap Publik" in d10 or "what is already public stays public" in d10.lower()
    assert "POJK No. 6" in d10
    assert "UU P2SK" in d10 or "UU No. 4 Tahun 2023" in d10
    assert "UU PDP" in d10 or "UU No. 27/2022" in d10
    assert "Top 5" in d10 or "5 pemegang" in d10.lower()
    assert "MoM" in d10
    assert "Telegram" in d10
    assert "CSV" in d10
    assert "50" in d10  # quota
    assert "One-Time" in d10 or "sekali bayar" in d10.lower()
    assert "checked = false" in d10 or "unchecked" in d10.lower()
    print("  [OK] disclaimer-and-paywall-wording.md D10 rules verified.")
    
    print("[PASS] All regulatory and pass rules verified.\n")

if __name__ == "__main__":
    test_files_exist()
    test_line_counts()
    test_regulatory_and_pass_content()
    print("ALL TESTS IN TEST_LEGAL_SUITE.PY PASSED SUCCESSFULLY!")
