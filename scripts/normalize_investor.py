"""
IHSG Storm - Investor Name Normalization Utility
================================================
Canonical investor name normalization for cross-snapshot reconciliation,
month-over-month joins, and entity deduplication.
"""

import re
from typing import Optional

# Legal entity tokens commonly found in Indonesian and international filings
LEGAL_PREFIXES = ("PT", "CV", "UD", "PD", "KOPERASI", "YAYASAN")
LEGAL_SUFFIXES = (
    "TBK", "LTD", "PTE LTD", "LIMITED", "INC", "INCORPORATED", "CORP",
    "CORPORATION", "LLC", "LLP", "B.V.", "BV", "NV", "N.V.", "GMBH",
    "AG", "SA", "S.A.", "PLC", "CO", "CO.", "COMPANY", "HOLDINGS", "HOLDING"
)

# Regex patterns for normalization
RE_WHITESPACE = re.compile(r"\s+")
RE_DOTS_AFTER_LEGAL = re.compile(r"\b(PT|CV|TBK|LTD|PTE|INC|CORP|CO)\.", re.IGNORECASE)
RE_COMMA_PREFIX_INVERSION = re.compile(
    r"^(.+?),\s*(PT|CV|UD|PD|KOPERASI|YAYASAN)(?:\s+(TBK))?$", re.IGNORECASE
)
RE_COMMA_SUFFIX_INVERSION = re.compile(
    r"^(.+?),\s*(TBK|LTD|PTE LTD|LIMITED|INC|CORP|LLC)$", re.IGNORECASE
)


def normalize_investor_name(name: Optional[str]) -> str:
    """Return clean, standardized human-readable investor name.
    
    Transformations:
      1. Uppercase & whitespace collapse
      2. Normalize legal dots (e.g. 'PT.' -> 'PT', 'TBK.' -> 'TBK')
      3. Handle comma inversions (e.g. 'NILA BANYU PERMAI, PT' -> 'PT NILA BANYU PERMAI')
      4. Place PT/CV consistently as prefix if stranded at end (e.g. 'FOO TBK PT' -> 'PT FOO TBK')
    """
    if not name:
        return ""

    s = name.strip().upper()
    s = RE_WHITESPACE.sub(" ", s)

    # Clean dots in common legal abbreviations
    s = RE_DOTS_AFTER_LEGAL.sub(r"\1", s)
    s = RE_WHITESPACE.sub(" ", s)

    # Comma inversion: 'ENTITY NAME, PT' -> 'PT ENTITY NAME'
    # Or 'ENTITY NAME, PT TBK' -> 'PT ENTITY NAME TBK'
    m_inv = RE_COMMA_PREFIX_INVERSION.match(s)
    if m_inv:
        base, prefix, tbk = m_inv.groups()
        base = base.strip()
        prefix = prefix.strip()
        if tbk:
            s = f"{prefix} {base} {tbk}"
        else:
            s = f"{prefix} {base}"

    # Comma inversion with suffix: 'ENTITY NAME, TBK' -> 'ENTITY NAME TBK'
    m_suff = RE_COMMA_SUFFIX_INVERSION.match(s)
    if m_suff:
        base, suffix = m_suff.groups()
        s = f"{base.strip()} {suffix.strip()}"

    # If PT or CV is trailing at the very end (e.g. 'FOO INVESTAMA TBK PT'):
    tokens = s.split()
    if len(tokens) > 1 and tokens[-1] in ("PT", "CV") and tokens[0] not in ("PT", "CV"):
        lead = tokens[-1]
        rest = tokens[:-1]
        s = f"{lead} {' '.join(rest)}"

    # Clean double commas or stray trailing punctuation
    s = re.sub(r"[,;]+", " ", s)
    s = RE_WHITESPACE.sub(" ", s).strip()

    return s


def canonical_investor_key(name: Optional[str]) -> str:
    """Return stripped canonical matching key for month-over-month joins.
    
    Removes legal entity noise (PT, TBK, LTD, etc.) and punctuation so that
    'PT PERSADA CAPITAL INVESTAMA' and 'PERSADA CAPITAL INVESTAMA' produce
    the identical key.
    """
    if not name:
        return ""

    s = normalize_investor_name(name)

    # Tokenize
    tokens = s.split()
    if not tokens:
        return ""

    # Strip leading legal prefixes
    while tokens and tokens[0] in LEGAL_PREFIXES:
        tokens.pop(0)

    # Strip trailing legal prefixes/suffixes
    all_strip = set(LEGAL_PREFIXES) | set(LEGAL_SUFFIXES) | {"PTE", "LIMITED", "CORP", "INC"}
    while tokens and tokens[-1] in all_strip:
        tokens.pop(-1)

    # Also strip if tokens still start with legal prefix
    while tokens and tokens[0] in LEGAL_PREFIXES:
        tokens.pop(0)

    res = " ".join(tokens)
    # Strip any remaining non-alphanumeric punctuation except space
    res = re.sub(r"[^\w\s]", "", res)
    res = RE_WHITESPACE.sub(" ", res).strip()

    return res if res else s


def is_same_investor(name1: Optional[str], name2: Optional[str]) -> bool:
    """Determine whether two investor name strings represent the same entity."""
    if not name1 or not name2:
        return False
    # Exact or normalized match
    if name1.strip().upper() == name2.strip().upper():
        return True
    if normalize_investor_name(name1) == normalize_investor_name(name2):
        return True
    key1 = canonical_investor_key(name1)
    key2 = canonical_investor_key(name2)
    return bool(key1 and key2 and key1 == key2)
