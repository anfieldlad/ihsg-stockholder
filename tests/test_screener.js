// tests/test_screener.js — F5 Screener Saham: acceptance metrics, derivation, gating, and store tests.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_screener.js (F5 Screener Saham)...');

const mem = () => ({
  store: {},
  getItem(k) { return k in this.store ? this.store[k] : null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
});

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.localStorage = mem();
globalThis.sessionStorage = mem();
const els = new Map();
globalThis.document = {
  body: { setAttribute() {}, getAttribute() {}, classList: { add() {}, remove() {} } },
  getElementById(id) {
    if (!els.has(id)) els.set(id, { id, focus() {}, scrollIntoView() {}, style: {}, classList: { add() {}, remove() {} } });
    return els.get(id);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {}
};
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { pushState() {}, replaceState() {} };
globalThis.requestAnimationFrame = (fn) => fn();

const data = JSON.parse(fs.readFileSync('public/shareholder_data.json', 'utf8'));
globalThis.fetch = async (url) => {
  if (String(url).includes('shareholder_data.json')) return { ok: true, json: async () => data };
  if (String(url).includes('prices')) return { ok: true, json: async () => ({ prices: {} }) };
  return { ok: false, json: async () => ({}) };
};

const url = (p) => pathToFileURL(path.resolve(process.cwd(), p)).href;
const read = (p) => fs.readFileSync(p, 'utf8');

const {
  deriveStockScreener,
  buildScreenerIndex,
  matchStock,
  countMatches,
  countActiveFilters,
  chipsText,
  SCREENER_DEFAULT,
  SCREENER_STORAGE_KEY
} = await import(url('public/src/screener.js'));

const { COPY } = await import(url('public/src/copy.js'));
const { storeConfig: store } = await import(url('public/src/store.js'));

// ---- 1. Data derivation over real shareholder_data.json ----
// Group items into stockMap
const sMap = {};
for (const item of data.items) {
  if (!sMap[item.code]) {
    sMap[item.code] = {
      code: item.code,
      issuer: item.issuer,
      holders: []
    };
  }
  sMap[item.code].holders.push(item);
}
for (const s of Object.values(sMap)) {
  s.holders.sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
  s.topHolder = s.holders[0] || null;
}

const index = buildScreenerIndex(sMap);
assert.strictEqual(index.length, 961, 'Dataset must have exactly 961 stocks');

// ---- 2. Strict Numerical Acceptance Metrics (Section 13.1) ----
// foreign >= 20%: exactly 243
const f20 = countMatches(index, { foreign: '20' });
assert.strictEqual(f20, 243, `foreign >= 20% must be 243, got ${f20}`);

// foreign >= 50%: exactly 128
const f50 = countMatches(index, { foreign: '50' });
assert.strictEqual(f50, 128, `foreign >= 50% must be 128, got ${f50}`);

// foreign >= 70%: exactly 72
const f70 = countMatches(index, { foreign: '70' });
assert.strictEqual(f70, 72, `foreign >= 70% must be 72, got ${f70}`);

// top1 >= 50%: exactly 533
const t1_50 = countMatches(index, { base: 't1', conc: '50' });
assert.strictEqual(t1_50, 533, `top1 >= 50% must be 533, got ${t1_50}`);

// top1 >= 70%: exactly 237
const t1_70 = countMatches(index, { base: 't1', conc: '70' });
assert.strictEqual(t1_70, 237, `top1 >= 70% must be 237, got ${t1_70}`);

// top1 >= 85%: exactly 81
const t1_85 = countMatches(index, { base: 't1', conc: '85' });
assert.strictEqual(t1_85, 81, `top1 >= 85% must be 81, got ${t1_85}`);

// top3 >= 50%: exactly 836
const t3_50 = countMatches(index, { base: 't3', conc: '50' });
assert.strictEqual(t3_50, 836, `top3 >= 50% must be 836, got ${t3_50}`);

// top3 >= 70%: exactly 577
const t3_70 = countMatches(index, { base: 't3', conc: '70' });
assert.strictEqual(t3_70, 577, `top3 >= 70% must be 577, got ${t3_70}`);

// top3 >= 85%: exactly 242
const t3_85 = countMatches(index, { base: 't3', conc: '85' });
assert.strictEqual(t3_85, 242, `top3 >= 85% must be 242, got ${t3_85}`);

// holders 1–2: exactly 86
const h12 = countMatches(index, { holders: '1-2' });
assert.strictEqual(h12, 86, `holders 1–2 must be 86, got ${h12}`);

// holders 3–5: exactly 280
const h35 = countMatches(index, { holders: '3-5' });
assert.strictEqual(h35, 280, `holders 3–5 must be 280, got ${h35}`);

// holders > 5: exactly 595
const h6p = countMatches(index, { holders: '6+' });
assert.strictEqual(h6p, 595, `holders > 5 must be 595, got ${h6p}`);

// BUMN / Sovereign: exactly 111
const bumn = countMatches(index, { tags: ['b'] });
assert.strictEqual(bumn, 111, `BUMN / Sovereign must be 111, got ${bumn}`);

// Dapen / Asuransi: exactly 139
const dapen = countMatches(index, { tags: ['d'] });
assert.strictEqual(dapen, 139, `Dapen / Asuransi must be 139, got ${dapen}`);

// Institusi asing: exactly 550
const fi = countMatches(index, { tags: ['x'] });
assert.strictEqual(fi, 550, `Institusi asing must be 550, got ${fi}`);

// Mayoritas individu: exactly 142
const indmaj = countMatches(index, { tags: ['m'] });
assert.strictEqual(indmaj, 142, `Mayoritas individu must be 142, got ${indmaj}`);

// Zero-result combination
const zeroMatch = countMatches(index, { foreign: '70', base: 't1', conc: '85', holders: '6+', tags: ['m'] });
assert.strictEqual(zeroMatch, 0, 'Zero-match combination cleanly returns 0');

// BUMN + Foreign >= 70% + Top1 >= 85% yields 0
const zeroBumn = countMatches(index, { foreign: '70', base: 't1', conc: '85', tags: ['b'] });
assert.strictEqual(zeroBumn, 0, 'BUMN + foreign 70% + top1 85% cleanly returns 0');

// ---- 3. Known Data Traps (Section 13.3) ----
// Null / undefined / NaN percentages handled safely
const trapStock1 = {
  code: 'TRAP1',
  issuer: 'Trap 1 Tbk',
  holders: [
    { percentage: null, local_foreign: null, investor_type: null, investor: null },
    { percentage: undefined, local_foreign: 'F', investor_type: 'Individual', investor: '' },
    { percentage: NaN, local_foreign: 'L', investor_type: 'CP', investor: 'PERSERO' }
  ]
};
const derived1 = deriveStockScreener(trapStock1);
assert.strictEqual(derived1.f, 0, 'Null/undefined/NaN percentage does not produce NaN foreign');
assert.strictEqual(derived1.t1, 0, 'Null percentage top1 is 0');
assert.strictEqual(derived1.t3, 0, 'Null percentage top3 is 0');
assert.strictEqual(derived1.b, true, 'PERSERO in investor name identified even with null types');
assert.strictEqual(derived1.x, false, 'No false foreign inst');

// Fewer than 3 holders handled safely
const trapStock2 = {
  code: 'TRAP2',
  issuer: 'Trap 2 Tbk',
  holders: [
    { percentage: 65.5, local_foreign: 'F', investor_type: 'State Owned Enterprises', investor: 'GOVERNMENT OF NORWAY' }
  ]
};
const derived2 = deriveStockScreener(trapStock2);
assert.strictEqual(derived2.n, 1);
assert.strictEqual(derived2.t1, 65.5);
assert.strictEqual(derived2.t3, 65.5, 'top3 with 1 holder equals top1');
assert.strictEqual(derived2.b, true, 'Sovereign wealth fund / State owned');
assert.strictEqual(derived2.x, true, 'Foreign inst');

// ---- 4. Store Integration & Gating ----
store.stockMap = sMap;
store.ensureScreenerIndex();

// Free user gating
store.userTier = 'gratis';
assert.strictEqual(store.isPro, false);
assert.strictEqual(store.isScreenerActive, false);
store.screenerOpen = false;
store.screenerOpenSheet();
assert.strictEqual(store.screenerOpen, false, 'Free user cannot open Screener sheet');
assert.strictEqual(store.proOpen, true, 'Free user opening screener triggers proSheet');
assert.strictEqual(store.proWhy, 'screener');
assert.strictEqual(store.screenerProGateCount, 128, 'Pro gate preview shows 128 matching stocks for foreign >= 50%');
assert.strictEqual(store.screenerProGateRows.length, 3, 'Pro gate preview shows top 3 rows');
store.closePro();

// Pro user interaction
store.userTier = 'pro';
assert.strictEqual(store.isPro, true);
store.screenerOpenSheet();
assert.strictEqual(store.screenerOpen, true, 'Pro user can open Screener sheet');
assert.strictEqual(store.screenerDraftCount, 961, 'Initial draft matches all 961 stocks');
assert.strictEqual(store.screenerDraftActiveCount, 0, 'Initial draft active count is 0');

// Set draft filters
store.screenerSetDraft('foreign', '50');
assert.strictEqual(store.screenerDraftCount, 128, 'Draft foreign 50% updates live to 128');
assert.strictEqual(store.screenerDraftActiveCount, 1, 'Draft active count is 1');
assert.strictEqual(store.isScreenerActive, false, 'Applied filter untouched while editing draft');

// Toggle tags
store.screenerToggleTag('b');
assert.strictEqual(store.screenerDraft.tags.includes('b'), true);
store.screenerToggleTag('b');
assert.strictEqual(store.screenerDraft.tags.includes('b'), false);

// Reset draft
store.screenerResetDraft();
assert.strictEqual(store.screenerDraft.foreign, '0');
assert.strictEqual(store.screenerDraftCount, 961);
assert.strictEqual(store.screenerDraftActiveCount, 0);

// Close sheet discards changes
store.screenerSetDraft('foreign', '70');
store.screenerCloseSheet();
assert.strictEqual(store.screenerOpen, false);
assert.strictEqual(store.isScreenerActive, false);

// Apply filter
store.screenerOpenSheet();
store.screenerSetDraft('foreign', '50');
store.screenerApply();
assert.strictEqual(store.screenerOpen, false);
assert.strictEqual(store.isScreenerActive, true);
assert.strictEqual(store.screenerActiveCount, 1);
assert.strictEqual(store.filteredStocks.length, 128, 'Filtered stocks reflects applied 128 stocks');
assert.deepStrictEqual(store.screenerActiveTags, ['Asing ≥ 50%']);

// Storage persisted
assert.ok(sessionStorage.getItem(SCREENER_STORAGE_KEY), 'Applied filters persisted in sessionStorage');

// Clear filters
store.screenerClear();
assert.strictEqual(store.isScreenerActive, false);
assert.strictEqual(store.filteredStocks.length, 961);
assert.strictEqual(sessionStorage.getItem(SCREENER_STORAGE_KEY), null, 'sessionStorage cleared');

// Downgrade to Free mid-session clears filters
store.screenerFilters = { foreign: '50', base: 't1', conc: '0', holders: 'all', tags: [] };
assert.strictEqual(store.isScreenerActive, true);
store.userTier = 'gratis';
store.screenerOnAuthChange();
assert.strictEqual(store.isScreenerActive, false, 'Downgrading to Free clears active filters');

// ---- 5. Copy & Gating Contract Verification ----
assert.strictEqual(COPY.pro_gates.screener.title, 'Screener saham');
assert.ok(COPY.pro_gates.screener.benefit.includes('Saring 961 saham'));

const screenerRow = COPY.pro_sheet.rows.find(r => r.feature === 'Screener saham');
assert.ok(screenerRow, 'pro_sheet.rows contains Screener saham');
assert.strictEqual(screenerRow.free, '–');
assert.strictEqual(screenerRow.pro, 'Ya');
assert.strictEqual(screenerRow.soon, false);

assert.strictEqual(COPY.screener.title, 'Screener Saham');
assert.strictEqual(COPY.screener.chip, 'Screener');
assert.strictEqual(COPY.screener.foreign, 'Kepemilikan asing');
assert.strictEqual(COPY.screener.conc, 'Konsentrasi');
assert.strictEqual(COPY.screener.holders, 'Jumlah pemegang');
assert.strictEqual(COPY.screener.types, 'Jenis pemegang');

// ---- 6. DOM & Security Gating Markup Guards ----
const html = read('public/index.html');
const css = read('public/assets/css/style.css');

// Critical security constraint: Screener sheet controls must NOT be rendered in Free DOM
assert.ok(
  /<template\s+x-if="isPro">\s*<div[^>]*id="screenerSheet"/.test(html),
  'CRITICAL: #screenerSheet MUST be inside <template x-if="isPro"> so controls are never injected into Free DOM'
);

// Lock chip present for Free
assert.ok(html.includes('id="chipLock"') && html.includes('x-show="!isPro"'), 'Lock chip present and gated by !isPro');

// Interactive chips for Pro
assert.ok(html.includes('id="chipIdle"') && html.includes('x-show="isPro && !isScreenerActive"'), 'Idle chip present for Pro');
assert.ok(html.includes('id="chipOn"') && html.includes('x-show="isPro && isScreenerActive"'), 'Active chip present for Pro');

// Summary strip and tags
assert.ok(html.includes('id="sumline"') && html.includes('x-show="isScreenerActive"'), 'Summary strip present and gated by isScreenerActive');
assert.ok(html.includes('id="sumTags"'), 'Filter tags container present');
assert.ok(html.includes('id="sumEdit"'), 'Ubah trigger present');
assert.ok(html.includes('id="chipClear"'), 'Clear button on active chip present');

// ---- 7. Styling & Hit Target Rules ----
// Sub-toggle Top 1 / Top 3 touch target >= 44px
assert.ok(
  /\.sc-sub\s+\.sc-seg\s+button\s*\{[^}]*min-height:\s*44px/.test(css),
  'Sub-toggle Top 1 | Top 3 buttons must have min-height: 44px'
);

// .sc-x hit target >= 44px via ::after
assert.ok(
  /\.sc-x::after\s*\{[^}]*min-width:\s*44px/.test(css) && /\.sc-x::after\s*\{[^}]*min-height:\s*44px/.test(css),
  'sc-x clear button must have >=44px hit target via ::after'
);

// D1: 44px hit areas for Ubah link and Screener chips
assert.ok(/\.sc-link::after\s*\{[^}]*height:\s*44px/.test(css), 'sc-link must have 44px hit area');
assert.ok(
  /#chipIdle::after,\s*#chipLock::after,\s*#chipOpen::after\s*\{[^}]*height:\s*44px/.test(css),
  'Screener chips must have 44px hit area'
);
assert.ok(/\.sc-x::after\s*\{[^}]*z-index:\s*1/.test(css), 'sc-x hit area must stack above chip button');
assert.ok(/padding-block:\s*7px\s*!important;\s*margin-block:\s*-5px/.test(css), 'chip scroller must not clip 44px hit areas');

// D2: apply scrolls Screener chip into view (inline nearest, reduced-motion aware)
{
  const src = fs.readFileSync('public/src/screener.js', 'utf8');
  assert.ok(/getElementById\('chipOn'\)/.test(src) && /inline:\s*'nearest'/.test(src), 'apply scrolls chipOn inline:nearest');
  assert.ok(/prefers-reduced-motion: reduce/.test(src) && /reduce \? 'auto' : 'smooth'/.test(src), 'smooth scroll respects reduced motion');
  assert.ok(/\$nextTick\(afterRender\)/.test(src) && /offsetWidth !== 0/.test(src), 'chip scroll runs after Alpine $nextTick and guards zero-size chip');
}

// Desktop modal width 560px
assert.ok(
  /#screenerSheet\s*\{[^}]*width:\s*560px/.test(css),
  'Desktop modal width overridden to 560px for #screenerSheet'
);

console.log('All test_screener.js assertions PASSED!');
