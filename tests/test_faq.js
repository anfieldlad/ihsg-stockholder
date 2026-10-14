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
assert.strictEqual(FAQ_ITEMS.length, 5, 'FAQ must have exactly 5 items');
assert.strictEqual(FAQ, FAQ_ITEMS, 'FAQ export alias matches FAQ_ITEMS');
assert.ok(COPY.faq, 'COPY.faq object exists');
assert.strictEqual(COPY.faq.items, FAQ_ITEMS, 'COPY.faq.items references FAQ_ITEMS');
assert.strictEqual(COPY.faq_items, FAQ_ITEMS, 'COPY.faq_items references FAQ_ITEMS');
assert.ok(typeof COPY.faq.empty === 'string' && COPY.faq.empty.length > 0, 'COPY.faq.empty is defined');

// Verify structure of all 5 items: { id, cat, q, a }
const allowedCats = new Set(['ksei', 'jadwal', 'legal']);
for (const item of FAQ_ITEMS) {
  assert.ok(typeof item.id === 'number', `item.id must be a number: got ${item.id}`);
  assert.ok(allowedCats.has(item.cat), `item.cat must be one of ksei/jadwal/legal: got ${item.cat}`);
  assert.ok(typeof item.q === 'string' && item.q.trim().length > 0, `item.q must be non-empty string for item ${item.id}`);
  assert.ok(typeof item.a === 'string' && item.a.trim().length > 0, `item.a must be non-empty string for item ${item.id}`);
}

// Verification of sensible category assignments: Q1 ksei, Q2 ksei, Q3 ksei, Q4 jadwal, Q5 legal
const qMap = new Map(FAQ_ITEMS.map(i => [i.id, i]));
assert.strictEqual(qMap.get(1).cat, 'ksei', 'Q1 must be in category ksei');
assert.strictEqual(qMap.get(2).cat, 'ksei', 'Q2 must be in category ksei');
assert.strictEqual(qMap.get(3).cat, 'ksei', 'Q3 must be in category ksei');
assert.strictEqual(qMap.get(4).cat, 'jadwal', 'Q4 must be in category jadwal');
assert.strictEqual(qMap.get(5).cat, 'legal', 'Q5 must be in category legal');

// Question copy sanity
assert.ok(qMap.get(1).q.includes('Apa itu IHSG Storm'), 'Q1 asks about IHSG Storm and data source');
assert.ok(qMap.get(2).q.includes('1%'), 'Q2 asks about 1% threshold');
assert.ok(qMap.get(3).q.includes('Domestik'), 'Q3 asks about Domestik/Asing/Warkat');
assert.ok(qMap.get(4).q.includes('15 menit'), 'Q4 asks about 15 minute delay');
assert.ok(qMap.get(5).q.includes('melaporkan'), 'Q5 asks about reporting data discrepancies');

console.log('  [PASS] Section 1: Module exports and FAQ items data contract verified');

// ---- 2. Per-Category Counts ----
const allItems = filterFaq(FAQ_ITEMS, 'all', '');
assert.strictEqual(allItems.length, 5, 'Category "all" must return all 5 items');

const kseiItems = filterFaq(FAQ_ITEMS, 'ksei', '');
assert.strictEqual(kseiItems.length, 3, 'Category "ksei" must return exactly 3 items');
assert.deepStrictEqual(kseiItems.map(i => i.id), [1, 2, 3], 'Category "ksei" returns Q1, Q2, Q3');

const jadwalItems = filterFaq(FAQ_ITEMS, 'jadwal', '');
assert.strictEqual(jadwalItems.length, 1, 'Category "jadwal" must return exactly 1 item');
assert.strictEqual(jadwalItems[0].id, 4, 'Category "jadwal" returns Q4');

const legalItems = filterFaq(FAQ_ITEMS, 'legal', '');
assert.strictEqual(legalItems.length, 1, 'Category "legal" must return exactly 1 item');
assert.strictEqual(legalItems[0].id, 5, 'Category "legal" returns Q5');

const unknownCatItems = filterFaq(FAQ_ITEMS, 'nonexistent', '');
assert.strictEqual(unknownCatItems.length, 0, 'Unknown category returns 0 items');

console.log('  [PASS] Section 2: Per-category counts (all: 5, ksei: 3, jadwal: 1, legal: 1)');

// ---- 3. Search Filtering (Case-Insensitive over q + a) ----
// Search in question (case-insensitive)
const sQ1 = filterFaq(FAQ_ITEMS, 'all', 'ambang batas');
assert.strictEqual(sQ1.length, 1, 'Search "ambang batas" matches Q2');
assert.strictEqual(sQ1[0].id, 2);

const sQ1Upper = filterFaq(FAQ_ITEMS, 'all', 'AMBANG BATAS');
assert.strictEqual(sQ1Upper.length, 1, 'Search "AMBANG BATAS" (uppercase) matches Q2');
assert.strictEqual(sQ1Upper[0].id, 2);

// Search in answer (case-insensitive)
const sA1 = filterFaq(FAQ_ITEMS, 'all', 'yahoo finance');
assert.strictEqual(sA1.length, 1, 'Search "yahoo finance" matches Q1 answer');
assert.strictEqual(sA1[0].id, 1);

const sA2 = filterFaq(FAQ_ITEMS, 'all', 'POJK');
assert.strictEqual(sA2.length, 1, 'Search "POJK" matches Q2 answer');
assert.strictEqual(sA2[0].id, 2);

// Search matching markup inside answer
const sMarkup = filterFaq(FAQ_ITEMS, 'all', 'Domestik (Lokal)');
assert.strictEqual(sMarkup.length, 1, 'Search text inside <b> tag matches Q3');
assert.strictEqual(sMarkup[0].id, 3);

// Search matching multiple questions
const sMulti = filterFaq(FAQ_ITEMS, 'all', '15 menit');
assert.strictEqual(sMulti.length, 2, 'Search "15 menit" matches Q1 (answer) and Q4 (question + answer)');
assert.deepStrictEqual(sMulti.map(i => i.id), [1, 4]);

// Search matching across almost all items
const sKsei = filterFaq(FAQ_ITEMS, 'all', 'ksei');
assert.strictEqual(sKsei.length, 4, 'Search "ksei" matches Q1, Q2, Q3, Q5');
assert.deepStrictEqual(sKsei.map(i => i.id), [1, 2, 3, 5]);

// Whitespace trimming
const sTrim = filterFaq(FAQ_ITEMS, 'all', '   regulasi   ');
assert.strictEqual(sTrim.length, 2, 'Search with padded whitespace trims and matches Q2 & Q4');

console.log('  [PASS] Section 3: Case-insensitive search over q + a');

// ---- 4. Combined Category AND Search Filtering ----
const comb1 = filterFaq(FAQ_ITEMS, 'ksei', '15 menit');
assert.strictEqual(comb1.length, 1, 'Category "ksei" + search "15 menit" narrows to Q1 only');
assert.strictEqual(comb1[0].id, 1);

const comb2 = filterFaq(FAQ_ITEMS, 'jadwal', '15 menit');
assert.strictEqual(comb2.length, 1, 'Category "jadwal" + search "15 menit" narrows to Q4 only');
assert.strictEqual(comb2[0].id, 4);

const comb3 = filterFaq(FAQ_ITEMS, 'legal', '15 menit');
assert.strictEqual(comb3.length, 0, 'Category "legal" + search "15 menit" yields 0 results');

const comb4 = filterFaq(FAQ_ITEMS, 'ksei', 'POJK');
assert.strictEqual(comb4.length, 1, 'Category "ksei" + search "POJK" matches Q2');
assert.strictEqual(comb4[0].id, 2);

const comb5 = filterFaq(FAQ_ITEMS, 'jadwal', 'POJK');
assert.strictEqual(comb5.length, 0, 'Category "jadwal" + search "POJK" yields 0 results');

console.log('  [PASS] Section 4: Combined category and search filtering');

// ---- 5. Empty State Filtering ----
const emptyResults = filterFaq(FAQ_ITEMS, 'all', 'kata_kunci_acak_yang_pasti_tidak_ada');
assert.strictEqual(emptyResults.length, 0, 'Empty results array returned when nothing matches');

const emptyCatResults = filterFaq(FAQ_ITEMS, 'legal', 'scalping');
assert.strictEqual(emptyCatResults.length, 0, 'No match in specific category returns empty array');

console.log('  [PASS] Section 5: Empty state filtering behavior');

// ---- 6. Store Integration & Reactive Getters ----
assert.ok(Array.isArray(store.faqItems), 'store.faqItems is present on storeConfig');
assert.strictEqual(store.faqItems.length, 5, 'store.faqItems has 5 items');
assert.strictEqual(store.faqCategory, 'all', 'store.faqCategory defaults to "all"');
assert.strictEqual(store.faqSearch, '', 'store.faqSearch defaults to empty string');
assert.strictEqual(store.openFaqIndex, null, 'store.openFaqIndex defaults to null');

// Default state returns all 5
assert.strictEqual(store.filteredFaq.length, 5, 'Default store.filteredFaq returns 5 items');

// Category switching
store.faqCategory = 'ksei';
store.faqSearch = '';
assert.strictEqual(store.filteredFaq.length, 3, 'store.filteredFaq reacts to faqCategory = "ksei"');
assert.deepStrictEqual(store.filteredFaq.map(i => i.id), [1, 2, 3]);

store.faqCategory = 'jadwal';
assert.strictEqual(store.filteredFaq.length, 1, 'store.filteredFaq reacts to faqCategory = "jadwal"');
assert.strictEqual(store.filteredFaq[0].id, 4);

store.faqCategory = 'legal';
assert.strictEqual(store.filteredFaq.length, 1, 'store.filteredFaq reacts to faqCategory = "legal"');
assert.strictEqual(store.filteredFaq[0].id, 5);

// Search filtering on store
store.faqCategory = 'all';
store.faqSearch = 'POJK';
assert.strictEqual(store.filteredFaq.length, 1, 'store.filteredFaq reacts to faqSearch');
assert.strictEqual(store.filteredFaq[0].id, 2);

// Combined on store
store.faqCategory = 'jadwal';
store.faqSearch = 'POJK';
assert.strictEqual(store.filteredFaq.length, 0, 'store.filteredFaq reacts to combined filters');

// Reset store state
store.faqCategory = 'all';
store.faqSearch = '';
assert.strictEqual(store.filteredFaq.length, 5);

// Accordion toggle behavior
store.openFaqIndex = null;
store.openFaqIndex = store.openFaqIndex === 1 ? null : 1;
assert.strictEqual(store.openFaqIndex, 1, 'Clicking closed item 1 opens it');
store.openFaqIndex = store.openFaqIndex === 1 ? null : 1;
assert.strictEqual(store.openFaqIndex, null, 'Clicking open item 1 closes it');

console.log('  [PASS] Section 6: Alpine store integration and accordion state');

// ---- 7. DOM & Accessibility Markup Guards ----
const html = read('public/index.html');
const css = read('public/assets/css/style.css');

assert.ok(html.includes('id="v-faq"'), '#v-faq section exists in public/index.html');
assert.ok(html.includes('x-for="item in filteredFaq"'), 'FAQ list rendered via x-for="item in filteredFaq"');
assert.ok(html.includes(':key="item.id"'), 'x-for uses :key="item.id"');
assert.ok(html.includes('x-model="faqSearch"'), 'faqSearch input bound with x-model');
assert.ok(html.includes("faqCategory = 'all'"), 'Chip bound to faqCategory = "all"');
assert.ok(html.includes("faqCategory = 'ksei'"), 'Chip bound to faqCategory = "ksei"');
assert.ok(html.includes("faqCategory = 'jadwal'"), 'Chip bound to faqCategory = "jadwal"');
assert.ok(html.includes("faqCategory = 'legal'"), 'Chip bound to faqCategory = "legal"');
assert.ok(html.includes(':aria-pressed="faqCategory === \'all\'"'), 'Chips have :aria-pressed attribute');

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

console.log('\nALL FAQ ACCEPTANCE TESTS PASSED UNCONDITIONALLY!');
