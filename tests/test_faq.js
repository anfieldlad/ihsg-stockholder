// tests/test_faq.js — FAQ topic chips, search filtering, empty state, a11y, and store integration.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_faq.js (FAQ Topic Chips & Search Filter)...');

// ---- Mock minimal browser environment for store import ----
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
globalThis.fetch = async () => ({ ok: false, json: async () => ({}) });

const url = (p) => pathToFileURL(path.resolve(process.cwd(), p)).href;
const read = (p) => fs.readFileSync(p, 'utf8');

// ---- 1. Module Imports & Contract Verification ----
const { COPY, FAQ_ITEMS, FAQ, filterFaq } = await import(url('public/src/copy.js'));
const { storeConfig: store } = await import(url('public/src/store.js'));

assert.ok(Array.isArray(FAQ_ITEMS), 'FAQ_ITEMS must be an array');
assert.strictEqual(FAQ_ITEMS.length, 30, 'FAQ must have exactly 30 items');
assert.strictEqual(FAQ, FAQ_ITEMS, 'FAQ export alias matches FAQ_ITEMS');
assert.ok(COPY.faq, 'COPY.faq object exists');
assert.strictEqual(COPY.faq.items, FAQ_ITEMS, 'COPY.faq.items references FAQ_ITEMS');
assert.strictEqual(COPY.faq_items, FAQ_ITEMS, 'COPY.faq_items references FAQ_ITEMS');
assert.ok(typeof COPY.faq.empty === 'string' && COPY.faq.empty.length > 0, 'COPY.faq.empty is defined');

// Verify structure of all 30 items: { id, cat, q, a }
const allowedCats = new Set(['ksei', 'jadwal', 'baca', 'fitur', 'akun-pro', 'legal']);
const idSet = new Set();
for (const item of FAQ_ITEMS) {
  assert.ok(typeof item.id === 'string' && /^[KJBFAL]\d+$/.test(item.id), `item.id must be a string like K1, J1, B1, F1, A1, L1: got ${item.id}`);
  assert.ok(!idSet.has(item.id), `item.id must be unique: duplicate ${item.id}`);
  idSet.add(item.id);
  assert.ok(allowedCats.has(item.cat), `item.cat must be one of allowed categories: got ${item.cat}`);
  assert.ok(typeof item.q === 'string' && item.q.trim().length > 0, `item.q must be non-empty string for item ${item.id}`);
  assert.ok(typeof item.a === 'string' && item.a.trim().length > 0, `item.a must be non-empty string for item ${item.id}`);
  // Answers should only use safe <b> markup if any
  const withoutB = item.a.replace(/<\/?b>/g, '');
  assert.ok(!/<[a-z][\s\S]*>/i.test(withoutB), `item.a contains unsupported HTML tags: ${item.a}`);
}

// Verification of category assignments
const qMap = new Map(FAQ_ITEMS.map(i => [i.id, i]));
assert.strictEqual(qMap.get('K1').cat, 'ksei', 'K1 must be in category ksei');
assert.strictEqual(qMap.get('K5').cat, 'ksei', 'K5 must be in category ksei');
assert.strictEqual(qMap.get('J1').cat, 'jadwal', 'J1 must be in category jadwal');
assert.strictEqual(qMap.get('J4').cat, 'jadwal', 'J4 must be in category jadwal');
assert.strictEqual(qMap.get('B1').cat, 'baca', 'B1 must be in category baca');
assert.strictEqual(qMap.get('B5').cat, 'baca', 'B5 must be in category baca');
assert.strictEqual(qMap.get('F1').cat, 'fitur', 'F1 must be in category fitur');
assert.strictEqual(qMap.get('F8').cat, 'fitur', 'F8 must be in category fitur');
assert.strictEqual(qMap.get('A1').cat, 'akun-pro', 'A1 must be in category akun-pro');
assert.strictEqual(qMap.get('A4').cat, 'akun-pro', 'A4 must be in category akun-pro');
assert.strictEqual(qMap.get('L1').cat, 'legal', 'L1 must be in category legal');
assert.strictEqual(qMap.get('L4').cat, 'legal', 'L4 must be in category legal');

// Question copy sanity
assert.ok(qMap.get('K1').q.includes('Apa itu IHSG Storm'), 'K1 asks about IHSG Storm and data source');
assert.ok(qMap.get('K2').q.includes('1%'), 'K2 asks about 1% threshold');
assert.ok(qMap.get('K3').q.includes('Domestik'), 'K3 asks about Domestik/Asing/Warkat');
assert.ok(qMap.get('J3').q.includes('15 menit'), 'J3 asks about 15 minute delay');
assert.ok(qMap.get('B1').q.includes('Top Holders'), 'B1 asks about Top Holders');
assert.ok(qMap.get('F1').q.includes('Perubahan Antar-Bulan'), 'F1 asks about Perubahan Antar-Bulan');
assert.ok(qMap.get('F7').q.includes('Screener'), 'F7 asks about Screener');
assert.ok(qMap.get('A1').q.includes('Gratis dan Pro'), 'A1 asks about Gratis vs Pro');
assert.ok(qMap.get('L1').q.includes('saran investasi'), 'L1 asks about investment advice disclaimer');
assert.ok(qMap.get('L4').q.includes('melaporkan'), 'L4 asks about reporting data discrepancies');

console.log('  [PASS] Section 1: Module exports and FAQ items data contract verified');

// ---- 2. Per-Category Counts ----
const allItems = filterFaq(FAQ_ITEMS, 'all', '');
assert.strictEqual(allItems.length, 30, 'Category "all" must return all 30 items');

const kseiItems = filterFaq(FAQ_ITEMS, 'ksei', '');
assert.strictEqual(kseiItems.length, 5, 'Category "ksei" must return exactly 5 items (K1-K5)');
assert.deepStrictEqual(kseiItems.map(i => i.id), ['K1', 'K2', 'K3', 'K4', 'K5']);

const jadwalItems = filterFaq(FAQ_ITEMS, 'jadwal', '');
assert.strictEqual(jadwalItems.length, 4, 'Category "jadwal" must return exactly 4 items (J1-J4)');
assert.deepStrictEqual(jadwalItems.map(i => i.id), ['J1', 'J2', 'J3', 'J4']);

const bacaItems = filterFaq(FAQ_ITEMS, 'baca', '');
assert.strictEqual(bacaItems.length, 5, 'Category "baca" must return exactly 5 items (B1-B5)');
assert.deepStrictEqual(bacaItems.map(i => i.id), ['B1', 'B2', 'B3', 'B4', 'B5']);

const fiturItems = filterFaq(FAQ_ITEMS, 'fitur', '');
assert.strictEqual(fiturItems.length, 8, 'Category "fitur" must return exactly 8 items (F1-F8)');
assert.deepStrictEqual(fiturItems.map(i => i.id), ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']);

const akunProItems = filterFaq(FAQ_ITEMS, 'akun-pro', '');
assert.strictEqual(akunProItems.length, 4, 'Category "akun-pro" must return exactly 4 items (A1-A4)');
assert.deepStrictEqual(akunProItems.map(i => i.id), ['A1', 'A2', 'A3', 'A4']);

const legalItems = filterFaq(FAQ_ITEMS, 'legal', '');
assert.strictEqual(legalItems.length, 4, 'Category "legal" must return exactly 4 items (L1-L4)');
assert.deepStrictEqual(legalItems.map(i => i.id), ['L1', 'L2', 'L3', 'L4']);

const unknownCatItems = filterFaq(FAQ_ITEMS, 'nonexistent', '');
assert.strictEqual(unknownCatItems.length, 0, 'Unknown category returns 0 items');

console.log('  [PASS] Section 2: Per-category counts (all: 30, ksei: 5, jadwal: 4, baca: 5, fitur: 8, akun-pro: 4, legal: 4)');

// ---- 3. Search Filtering (Case-Insensitive over q + a) ----
// Search in question (case-insensitive)
const sAmbang = filterFaq(FAQ_ITEMS, 'all', 'ambang kepemilikan');
assert.strictEqual(sAmbang.length, 1, 'Search "ambang kepemilikan" matches K2');
assert.strictEqual(sAmbang[0].id, 'K2');

const sAmbangUpper = filterFaq(FAQ_ITEMS, 'all', 'AMBANG KEPEMILIKAN');
assert.strictEqual(sAmbangUpper.length, 1, 'Search "AMBANG KEPEMILIKAN" (uppercase) matches K2');
assert.strictEqual(sAmbangUpper[0].id, 'K2');

// Search in answer (case-insensitive)
const sA1 = filterFaq(FAQ_ITEMS, 'all', 'yahoo finance');
assert.strictEqual(sA1.length, 1, 'Search "yahoo finance" matches K1 answer');
assert.strictEqual(sA1[0].id, 'K1');

const sA2 = filterFaq(FAQ_ITEMS, 'all', 'POJK');
assert.strictEqual(sA2.length, 1, 'Search "POJK" matches K2 answer');
assert.strictEqual(sA2[0].id, 'K2');

// Search matching markup inside answer
const sMarkup = filterFaq(FAQ_ITEMS, 'all', 'Warkat / Scrip');
assert.strictEqual(sMarkup.length, 1, 'Search text inside <b> tag matches K3');
assert.strictEqual(sMarkup[0].id, 'K3');

// Search matching keywords specified for QA: Pro, Google, Scrip, and empty-state Dividen
const sPro = filterFaq(FAQ_ITEMS, 'all', 'Pro');
assert.ok(sPro.length >= 8, `Search "Pro" matches at least 8 items, got ${sPro.length}`);
assert.ok(sPro.some(i => i.id === 'A1'), 'Search "Pro" includes A1');
assert.ok(sPro.some(i => i.id === 'F7'), 'Search "Pro" includes F7');

const sGoogle = filterFaq(FAQ_ITEMS, 'all', 'Google');
assert.strictEqual(sGoogle.length, 3, 'Search "Google" matches exactly 3 items (A3, A4, L2)');
assert.deepStrictEqual(sGoogle.map(i => i.id), ['A3', 'A4', 'L2']);

const sScrip = filterFaq(FAQ_ITEMS, 'all', 'Scrip');
assert.strictEqual(sScrip.length, 1, 'Search "Scrip" matches K3');
assert.strictEqual(sScrip[0].id, 'K3');

const sDividen = filterFaq(FAQ_ITEMS, 'all', 'Dividen');
assert.strictEqual(sDividen.length, 0, 'Search "Dividen" yields 0 results (empty state keyword)');

// Search across new categories
const sScreener = filterFaq(FAQ_ITEMS, 'all', 'Screener');
assert.ok(sScreener.length >= 4, `Search "Screener" matches at least 4 items across categories, got ${sScreener.length}`);

const sPindahNama = filterFaq(FAQ_ITEMS, 'all', 'Pindah nama');
assert.strictEqual(sPindahNama.length, 1, 'Search "Pindah nama" matches F3');
assert.strictEqual(sPindahNama[0].id, 'F3');

const sTerdilusi = filterFaq(FAQ_ITEMS, 'all', 'Terdilusi');
assert.strictEqual(sTerdilusi.length, 1, 'Search "Terdilusi" matches F4');
assert.strictEqual(sTerdilusi[0].id, 'F4');

const sDonut = filterFaq(FAQ_ITEMS, 'all', 'donut');
assert.strictEqual(sDonut.length, 1, 'Search "donut" matches B2');
assert.strictEqual(sDonut[0].id, 'B2');

const sDyor = filterFaq(FAQ_ITEMS, 'all', 'DYOR');
assert.strictEqual(sDyor.length, 1, 'Search "DYOR" matches L1');
assert.strictEqual(sDyor[0].id, 'L1');

// Whitespace trimming
const sTrim = filterFaq(FAQ_ITEMS, 'all', '   regulasi   ');
assert.strictEqual(sTrim.length, 1, 'Search with padded whitespace trims and matches K2');
assert.strictEqual(sTrim[0].id, 'K2');

console.log('  [PASS] Section 3: Case-insensitive search over q + a across new categories');

// ---- 4. Combined Category AND Search Filtering ----
const comb1 = filterFaq(FAQ_ITEMS, 'ksei', '15 menit');
assert.strictEqual(comb1.length, 1, 'Category "ksei" + search "15 menit" narrows to K1 only');
assert.strictEqual(comb1[0].id, 'K1');

const comb2 = filterFaq(FAQ_ITEMS, 'jadwal', '15 menit');
assert.strictEqual(comb2.length, 1, 'Category "jadwal" + search "15 menit" narrows to J3 only');
assert.strictEqual(comb2[0].id, 'J3');

const comb3 = filterFaq(FAQ_ITEMS, 'legal', '15 menit');
assert.strictEqual(comb3.length, 0, 'Category "legal" + search "15 menit" yields 0 results');

const comb4 = filterFaq(FAQ_ITEMS, 'akun-pro', 'Google');
assert.strictEqual(comb4.length, 2, 'Category "akun-pro" + search "Google" narrows to A3, A4');
assert.deepStrictEqual(comb4.map(i => i.id), ['A3', 'A4']);

const comb5 = filterFaq(FAQ_ITEMS, 'legal', 'Google');
assert.strictEqual(comb5.length, 1, 'Category "legal" + search "Google" narrows to L2');
assert.strictEqual(comb5[0].id, 'L2');

const comb6 = filterFaq(FAQ_ITEMS, 'fitur', 'Screener');
assert.strictEqual(comb6.length, 2, 'Category "fitur" + search "Screener" narrows to F7, F8');
assert.deepStrictEqual(comb6.map(i => i.id), ['F7', 'F8']);

console.log('  [PASS] Section 4: Combined category and search filtering');

// ---- 5. Empty State Filtering ----
const emptyResults = filterFaq(FAQ_ITEMS, 'all', 'kata_kunci_acak_yang_pasti_tidak_ada');
assert.strictEqual(emptyResults.length, 0, 'Empty results array returned when nothing matches');

const emptyCatResults = filterFaq(FAQ_ITEMS, 'legal', 'pindah nama');
assert.strictEqual(emptyCatResults.length, 0, 'No match in specific category returns empty array');

console.log('  [PASS] Section 5: Empty state filtering behavior');

// ---- 6. Store Integration & Reactive Getters ----
assert.ok(Array.isArray(store.faqItems), 'store.faqItems is present on storeConfig');
assert.strictEqual(store.faqItems.length, 30, 'store.faqItems has 30 items');
assert.strictEqual(store.faqCategory, 'all', 'store.faqCategory defaults to "all"');
assert.strictEqual(store.faqSearch, '', 'store.faqSearch defaults to empty string');
assert.strictEqual(store.openFaqIndex, null, 'store.openFaqIndex defaults to null');

// Default state returns all 30
assert.strictEqual(store.filteredFaq.length, 30, 'Default store.filteredFaq returns 30 items');

// Category switching on store
store.faqCategory = 'ksei';
store.faqSearch = '';
assert.strictEqual(store.filteredFaq.length, 5, 'store.filteredFaq reacts to faqCategory = "ksei"');
assert.deepStrictEqual(store.filteredFaq.map(i => i.id), ['K1', 'K2', 'K3', 'K4', 'K5']);

store.faqCategory = 'jadwal';
assert.strictEqual(store.filteredFaq.length, 4, 'store.filteredFaq reacts to faqCategory = "jadwal"');
assert.deepStrictEqual(store.filteredFaq.map(i => i.id), ['J1', 'J2', 'J3', 'J4']);

store.faqCategory = 'baca';
assert.strictEqual(store.filteredFaq.length, 5, 'store.filteredFaq reacts to faqCategory = "baca"');
assert.deepStrictEqual(store.filteredFaq.map(i => i.id), ['B1', 'B2', 'B3', 'B4', 'B5']);

store.faqCategory = 'fitur';
assert.strictEqual(store.filteredFaq.length, 8, 'store.filteredFaq reacts to faqCategory = "fitur"');
assert.deepStrictEqual(store.filteredFaq.map(i => i.id), ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8']);

store.faqCategory = 'akun-pro';
assert.strictEqual(store.filteredFaq.length, 4, 'store.filteredFaq reacts to faqCategory = "akun-pro"');
assert.deepStrictEqual(store.filteredFaq.map(i => i.id), ['A1', 'A2', 'A3', 'A4']);

store.faqCategory = 'legal';
assert.strictEqual(store.filteredFaq.length, 4, 'store.filteredFaq reacts to faqCategory = "legal"');
assert.deepStrictEqual(store.filteredFaq.map(i => i.id), ['L1', 'L2', 'L3', 'L4']);

// Search filtering on store
store.faqCategory = 'all';
store.faqSearch = 'Google';
assert.strictEqual(store.filteredFaq.length, 3, 'store.filteredFaq reacts to faqSearch');

// Combined on store
store.faqCategory = 'akun-pro';
store.faqSearch = 'Google';
assert.strictEqual(store.filteredFaq.length, 2, 'store.filteredFaq reacts to combined filters');

// Reset store state
store.faqCategory = 'all';
store.faqSearch = '';
assert.strictEqual(store.filteredFaq.length, 30);

// Accordion toggle behavior
store.openFaqIndex = null;
store.openFaqIndex = store.openFaqIndex === 'K1' ? null : 'K1';
assert.strictEqual(store.openFaqIndex, 'K1', 'Clicking closed item K1 opens it');
store.openFaqIndex = store.openFaqIndex === 'K1' ? null : 'K1';
assert.strictEqual(store.openFaqIndex, null, 'Clicking open item K1 closes it');

console.log('  [PASS] Section 6: Alpine store integration and accordion state');

// ---- 7. DOM & Accessibility Markup Guards ----
const html = read('public/index.html');
const css = read('public/assets/css/style.css');

assert.ok(html.includes('id="v-faq"'), '#v-faq section exists in public/index.html');
assert.ok(html.includes('x-for="item in filteredFaq"'), 'FAQ list rendered via x-for="item in filteredFaq"');
assert.ok(html.includes(':key="item.id"'), 'x-for uses :key="item.id"');
assert.ok(html.includes('x-model="faqSearch"'), 'faqSearch input bound with x-model');

// All 7 topic chips present
assert.ok(html.includes("faqCategory = 'all'"), 'Chip bound to faqCategory = "all"');
assert.ok(html.includes("faqCategory = 'ksei'"), 'Chip bound to faqCategory = "ksei"');
assert.ok(html.includes("faqCategory = 'jadwal'"), 'Chip bound to faqCategory = "jadwal"');
assert.ok(html.includes("faqCategory = 'baca'"), 'Chip bound to faqCategory = "baca"');
assert.ok(html.includes("faqCategory = 'fitur'"), 'Chip bound to faqCategory = "fitur"');
assert.ok(html.includes("faqCategory = 'akun-pro'"), 'Chip bound to faqCategory = "akun-pro"');
assert.ok(html.includes("faqCategory = 'legal'"), 'Chip bound to faqCategory = "legal"');
assert.ok(html.includes(':aria-pressed="faqCategory === \'all\'"'), 'Chips have :aria-pressed attribute');

// Chip label text checks
assert.ok(html.includes('Semua Topik'), 'Chip label "Semua Topik" exists');
assert.ok(html.includes('Data KSEI ≥1%'), 'Chip label "Data KSEI ≥1%" exists');
assert.ok(html.includes('Jadwal & Delay'), 'Chip label "Jadwal & Delay" exists');
assert.ok(html.includes('Cara Baca Data'), 'Chip label "Cara Baca Data" exists');
assert.ok(html.includes('Fitur Analisis'), 'Chip label "Fitur Analisis" exists');
assert.ok(html.includes('Akun & Pro'), 'Chip label "Akun & Pro" exists');
assert.ok(html.includes('Legalitas & DYOR'), 'Chip label "Legalitas & DYOR" exists');

// Accordion accessibility & structure
assert.ok(html.includes('<button class="faq-q" type="button"'), 'Accordion trigger is a button with class faq-q and type="button"');
assert.ok(html.includes(':aria-expanded="openFaqIndex === item.id'), 'Accordion trigger has :aria-expanded bound to open state');
assert.ok(html.includes('x-show="openFaqIndex === item.id"'), 'Accordion answer panel uses x-show bound to openFaqIndex === item.id');
assert.ok(html.includes('x-html="item.a"'), 'Accordion answer safely renders fixed copy via x-html="item.a"');

// Empty state element
assert.ok(html.includes('id="faqEmpty"'), 'Empty state element #faqEmpty present');
assert.ok(html.includes('filteredFaq.length === 0'), 'Empty state shown when filteredFaq.length === 0');

// Toby security guard: no user-controlled search query evaluated as innerHTML
assert.ok(!html.includes('x-html="faqSearch"'), 'Toby guard: faqSearch is NEVER injected via x-html');
assert.ok(!html.includes('innerHTML = faqSearch'), 'Toby guard: faqSearch is NEVER injected via innerHTML');

console.log('  [PASS] Section 7: DOM, a11y, and Toby security markup guards');

// ---- 8. CSS Touch Target & Style Verification ----
assert.ok(/\.faq-q\s*\{[^}]*min-height:\s*44px/.test(css), '.faq-q has min-height: 44px touch target');
assert.ok(/#v-faq\s+\.chips\s+\.chip::after\s*\{[^}]*height:\s*44px/.test(css), '#v-faq chips have 44px touch target via ::after');

console.log('  [PASS] Section 8: 44px touch targets verified in style.css');

// ---- 9. Definition of Done & Quality Guard Assertions ----
for (const item of FAQ_ITEMS) {
  // Disallowed tier labels / pricing
  assert.ok(!/\b(paket investor|paket pakar|tier investor|tier pakar|premium|plus)\b/i.test(item.a), `No unofficial tier names in ${item.id}: ${item.a}`);
  assert.ok(!/Rp\s*\d/i.test(item.a), `No pricing in ${item.id}: ${item.a}`);
}

console.log('  [PASS] Section 9: Quality and copy compliance guards passed');

console.log('\nALL FAQ ACCEPTANCE TESTS PASSED UNCONDITIONALLY!');
