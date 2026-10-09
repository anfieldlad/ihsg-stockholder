import assert from 'node:assert';
import fs from 'node:fs';

const modPath = fs.existsSync(new URL('../public/src/normalize.js', import.meta.url)) 
  ? '../public/src/normalize.js' 
  : '../src/normalize.js';
const { normalizeInvestorName, canonicalInvestorKey, isSameInvestor } = await import(modPath);

console.log('Running test_normalize.js...');

// Whitespace and casing
assert.strictEqual(normalizeInvestorName('  indrawati kamarudin  '), 'INDRAWATI KAMARUDIN');
assert.strictEqual(normalizeInvestorName('INDRAWATI  KAMARUDIN'), 'INDRAWATI KAMARUDIN');
assert.strictEqual(isSameInvestor('INDRAWATI KAMARUDIN', 'INDRAWATI  KAMARUDIN'), true);

// Dots and legal abbreviations
assert.strictEqual(normalizeInvestorName('PT. DUNIA SURYA BAKTI'), 'PT DUNIA SURYA BAKTI');
assert.strictEqual(normalizeInvestorName('PT. Dunia Surya Bakti'), 'PT DUNIA SURYA BAKTI');
assert.strictEqual(isSameInvestor('PT. DUNIA SURYA BAKTI', 'PT. Dunia Surya Bakti'), true);
assert.strictEqual(isSameInvestor('PT SAMUEL TUMBUH BERSAMA', 'PT. SAMUEL TUMBUH BERSAMA'), true);

// Comma inversions
assert.strictEqual(normalizeInvestorName('NILA BANYU PERMAI, PT'), 'PT NILA BANYU PERMAI');
assert.strictEqual(normalizeInvestorName('TRINITAN GLOBAL PASIFIK, PT'), 'PT TRINITAN GLOBAL PASIFIK');
assert.strictEqual(isSameInvestor('PT. Nila Banyu Permai', 'NILA BANYU PERMAI, PT'), true);

// Cross-month variations
assert.strictEqual(isSameInvestor('PERSADA CAPITAL INVESTAMA', 'PT PERSADA CAPITAL INVESTAMA'), true);
assert.strictEqual(isSameInvestor('SARATOGA INVESTAMA SEDAYA TBK PT', 'SARATOGA INVESTAMA SEDAYA TBK'), true);
assert.strictEqual(isSameInvestor('JARDINE CYCLE AND CARRIAGE LIMITED', 'JARDINE CYCLE  AND CARRIAGE LIMITED'), true);

console.log('All JS normalization tests PASSED!');
