/**
 * IHSG Storm - Investor Name Normalization Utility (JS / Frontend)
 * ================================================================
 * Canonical investor name normalization for cross-snapshot reconciliation,
 * client-side deduplication, and search matching.
 */

const LEGAL_PREFIXES = new Set(['PT', 'CV', 'UD', 'PD', 'KOPERASI', 'YAYASAN']);
const LEGAL_SUFFIXES = new Set([
  'TBK', 'LTD', 'PTE LTD', 'PTE', 'LIMITED', 'INC', 'INCORPORATED', 'CORP',
  'CORPORATION', 'LLC', 'LLP', 'B.V.', 'BV', 'NV', 'N.V.', 'GMBH',
  'AG', 'SA', 'S.A.', 'PLC', 'CO', 'COMPANY', 'HOLDINGS', 'HOLDING'
]);

/**
 * Return clean, standardized human-readable investor name.
 * @param {string} name
 * @returns {string}
 */
export function normalizeInvestorName(name) {
  if (!name) return '';

  let s = String(name).trim().toUpperCase();
  s = s.replace(/\s+/g, ' ');

  // Clean dots in common legal abbreviations (PT. -> PT, TBK. -> TBK)
  s = s.replace(/\b(PT|CV|TBK|LTD|PTE|INC|CORP|CO)\./gi, '$1');
  s = s.replace(/\s+/g, ' ');

  // Comma inversion: 'ENTITY NAME, PT' -> 'PT ENTITY NAME'
  const invMatch = s.match(/^(.+?),\s*(PT|CV|UD|PD|KOPERASI|YAYASAN)(?:\s+(TBK))?$/i);
  if (invMatch) {
    const base = invMatch[1].trim();
    const prefix = invMatch[2].trim();
    const tbk = invMatch[3] ? ` ${invMatch[3].trim()}` : '';
    s = `${prefix} ${base}${tbk}`;
  }

  // Comma inversion with suffix: 'ENTITY NAME, TBK' -> 'ENTITY NAME TBK'
  const suffMatch = s.match(/^(.+?),\s*(TBK|LTD|PTE LTD|LIMITED|INC|CORP|LLC)$/i);
  if (suffMatch) {
    s = `${suffMatch[1].trim()} ${suffMatch[2].trim()}`;
  }

  // If PT or CV is trailing at the very end ('FOO TBK PT' -> 'PT FOO TBK')
  const tokens = s.split(' ');
  if (tokens.length > 1 && (tokens[tokens.length - 1] === 'PT' || tokens[tokens.length - 1] === 'CV') && !LEGAL_PREFIXES.has(tokens[0])) {
    const lead = tokens.pop();
    s = `${lead} ${tokens.join(' ')}`;
  }

  // Clean double commas or stray punctuation
  s = s.replace(/[,;]+/g, ' ').replace(/\s+/g, ' ').trim();

  return s;
}

/**
 * Return stripped canonical matching key for month-over-month joins.
 * Removes legal entity prefixes/suffixes (PT, TBK, LTD, etc.) and punctuation.
 * @param {string} name
 * @returns {string}
 */
export function canonicalInvestorKey(name) {
  if (!name) return '';

  const normalized = normalizeInvestorName(name);
  const tokens = normalized.split(' ');
  if (!tokens.length) return '';

  // Strip leading prefixes
  while (tokens.length && LEGAL_PREFIXES.has(tokens[0])) {
    tokens.shift();
  }

  // Strip trailing prefixes/suffixes
  const allStrip = new Set([...LEGAL_PREFIXES, ...LEGAL_SUFFIXES]);
  while (tokens.length && allStrip.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  // Re-check leading
  while (tokens.length && LEGAL_PREFIXES.has(tokens[0])) {
    tokens.shift();
  }

  let res = tokens.join(' ');
  res = res.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();

  return res || normalized;
}

/**
 * Check if two investor name strings represent the same entity.
 * @param {string} name1
 * @param {string} name2
 * @returns {boolean}
 */
export function isSameInvestor(name1, name2) {
  if (!name1 || !name2) return false;
  if (name1.trim().toUpperCase() === name2.trim().toUpperCase()) return true;
  if (normalizeInvestorName(name1) === normalizeInvestorName(name2)) return true;
  const k1 = canonicalInvestorKey(name1);
  const k2 = canonicalInvestorKey(name2);
  return Boolean(k1 && k2 && k1 === k2);
}
