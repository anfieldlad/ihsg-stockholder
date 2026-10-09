"""
Test suite for IHSG D10: Toby wording review for 'stop publishing full dataset' + disclaimers.
Verifies /home/hermes/company/ihsg/legal/disclaimer-and-paywall-wording.md and
repo docs/legal/disclaimer-and-paywall-wording.md against regulatory and design constraints.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_FILE = REPO_ROOT / "docs" / "legal" / "disclaimer-and-paywall-wording.md"
COMPANY_FILE = Path("/home/hermes/company/ihsg/legal/disclaimer-and-paywall-wording.md")


def test_files_exist_and_match():
    assert DOCS_FILE.exists(), f"Repo docs file missing: {DOCS_FILE}"
    assert COMPANY_FILE.exists(), f"Company file missing: {COMPANY_FILE}"
    
    docs_text = DOCS_FILE.read_text(encoding="utf-8")
    company_text = COMPANY_FILE.read_text(encoding="utf-8")
    assert docs_text == company_text, "Repo docs and company legal copies must be identical"
    assert len(docs_text) > 5000, "Document should be substantive (>5KB)"


def test_line_count_within_limits():
    lines = DOCS_FILE.read_text(encoding="utf-8").splitlines()
    total_lines = len(lines)
    print(f"Total lines in disclaimer-and-paywall-wording.md: {total_lines}")
    assert total_lines < 400, f"File exceeds 400-line budget: {total_lines} lines"
    assert total_lines >= 150, f"File unexpectedly short: {total_lines} lines"


def test_d10_strategic_foundations():
    content = DOCS_FILE.read_text(encoding="utf-8")
    # Decision D10 and Jim's architecture reference
    assert "D10" in content
    assert "architecture-v3.md" in content
    assert "Toby" in content
    
    # Core premise: what is already public stays public
    assert "Data Publik Tetap Publik" in content or "what is already public stays public" in content.lower()
    assert "shareholder_data.json" in content
    assert "7.154" in content or "7154" in content
    
    # Value positioning: history, diffs, alerts, export, convenience (NOT secrecy)
    assert "Histori Multi-Bulan" in content or "Multi-Month Archive" in content
    assert "MoM Diffs" in content or "MoM Delta" in content
    assert "Telegram" in content
    assert "CSV Export" in content or "Ekspor" in content
    assert "Kenyamanan" in content or "Convenience" in content


def test_feature_tier_matrix():
    content = DOCS_FILE.read_text(encoding="utf-8")
    # Tiers
    assert "Tier Gratis (Pemula)" in content
    assert "Tier Investor" in content
    assert "Tier Pakar" in content
    assert "Founder Pass" in content
    
    # Prices and durations
    assert "19.000" in content or "19k" in content
    assert "190.000" in content or "190k" in content
    assert "49.000" in content or "49k" in content
    assert "490.000" in content or "490k" in content
    assert "599.000" in content
    assert "50 kursi" in content or "50 Kursi" in content
    
    # Top-5 vs 1..N gating
    assert "Top 5" in content or "top 5" in content.lower()
    assert "595" in content and "961" in content  # empirical issuer count context


def test_ojk_statutory_disclaimers():
    content = DOCS_FILE.read_text(encoding="utf-8")
    # Regulatory citations
    assert "POJK No. 6 Tahun 2026" in content or "POJK No. 6" in content
    assert "UU No. 4 Tahun 2023" in content or "UU P2SK" in content
    assert "Pasal 237" in content
    assert "UU Pasar Modal" in content
    
    # Footer disclaimer wording
    assert "PENAFIAN STATUTER" in content or "PENAFIAN PENTING" in content
    assert "ihsg.badai.tech" in content
    assert "BUKAN Penasihat Investasi" in content
    assert "DYOR" in content or "Do Your Own Research" in content
    
    # Checkout modal checkboxes
    assert "checked = false" in content or "unchecked" in content.lower()
    assert "Kotak Centang 1" in content
    assert "Kotak Centang 2" in content
    assert "One-Time" in content or "sekali bayar" in content.lower()
    assert "tanpa perpanjangan otomatis" in content.lower()
    
    # CSV Header formatting
    assert "# DISCLAIMER" in content or "# DISCLAIMER & LISENSI" in content
    assert "# PERINGATAN REGULASI" in content
    assert "# LISENSI PENGGUNA" in content
    
    # Detail banner and notification copy
    assert "modal-stock.html" in content
    assert "@IHSGStormBot" in content or "Bot Telegram" in content


def test_uu_pdp_compliance_sections():
    content = DOCS_FILE.read_text(encoding="utf-8")
    assert "UU No. 27/2022" in content or "UU PDP" in content
    assert "Pengendali Data Pribadi" in content
    assert "GET /api/v1/me/export" in content
    assert "DELETE /api/v1/me" in content
    assert "10 tahun" in content or "10 Tahun" in content  # UU Dokumen Perusahaan
    assert "Umami" in content
    assert "Xendit" in content
    assert "Firebase" in content


def test_anti_pom_pom_terminology_dictionary():
    content = DOCS_FILE.read_text(encoding="utf-8")
    # Prohibited slang vs compliant terminology
    assert "Sinyal Beli / Jual" in content or "Buy/Sell Signals" in content
    assert "Bandar" in content
    assert "MoM Delta" in content
    assert "Harga Penutupan" in content


if __name__ == "__main__":
    test_files_exist_and_match()
    test_line_count_within_limits()
    test_d10_strategic_foundations()
    test_feature_tier_matrix()
    test_ojk_statutory_disclaimers()
    test_uu_pdp_compliance_sections()
    test_anti_pom_pom_terminology_dictionary()
    print("ALL TESTS IN TEST_DISCLAIMER_PAYWALL_WORDING.PY PASSED SUCCESSFULLY!")
