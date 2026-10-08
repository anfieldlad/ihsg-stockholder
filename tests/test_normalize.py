import pytest
from scripts.normalize_investor import (
    normalize_investor_name,
    canonical_investor_key,
    is_same_investor,
)


def test_whitespace_and_casing():
    assert normalize_investor_name("  indrawati kamarudin  ") == "INDRAWATI KAMARUDIN"
    assert normalize_investor_name("INDRAWATI  KAMARUDIN") == "INDRAWATI KAMARUDIN"
    assert is_same_investor("INDRAWATI KAMARUDIN", "INDRAWATI  KAMARUDIN")


def test_dots_and_legal_entities():
    assert normalize_investor_name("PT. DUNIA SURYA BAKTI") == "PT DUNIA SURYA BAKTI"
    assert normalize_investor_name("PT. Dunia Surya Bakti") == "PT DUNIA SURYA BAKTI"
    assert is_same_investor("PT. DUNIA SURYA BAKTI", "PT. Dunia Surya Bakti")
    assert is_same_investor("PT SAMUEL TUMBUH BERSAMA", "PT. SAMUEL TUMBUH BERSAMA")


def test_comma_inversion():
    assert normalize_investor_name("NILA BANYU PERMAI, PT") == "PT NILA BANYU PERMAI"
    assert normalize_investor_name("TRINITAN GLOBAL PASIFIK, PT") == "PT TRINITAN GLOBAL PASIFIK"
    assert is_same_investor("PT. Nila Banyu Permai", "NILA BANYU PERMAI, PT")
    assert is_same_investor("PT. TRINITAN GLOBAL PASIFIK", "TRINITAN GLOBAL PASIFIK, PT")


def test_cross_month_legal_form_variations():
    # 'PT PERSADA CAPITAL INVESTAMA' vs 'PERSADA CAPITAL INVESTAMA'
    name_may = "PERSADA CAPITAL INVESTAMA"
    name_sep = "PT PERSADA CAPITAL INVESTAMA"
    assert is_same_investor(name_may, name_sep)
    assert canonical_investor_key(name_may) == canonical_investor_key(name_sep)

    # 'SARATOGA INVESTAMA SEDAYA TBK PT' vs 'SARATOGA INVESTAMA SEDAYA TBK'
    adro_may = "SARATOGA INVESTAMA SEDAYA TBK PT"
    adro_sep = "SARATOGA INVESTAMA SEDAYA TBK"
    assert is_same_investor(adro_may, adro_sep)
    assert canonical_investor_key(adro_may) == canonical_investor_key(adro_sep)

    # 'JARDINE CYCLE AND CARRIAGE LIMITED' vs 'JARDINE CYCLE  AND CARRIAGE LIMITED'
    asii_may = "JARDINE CYCLE AND CARRIAGE LIMITED"
    asii_sep = "JARDINE CYCLE  AND CARRIAGE LIMITED"
    assert is_same_investor(asii_may, asii_sep)
