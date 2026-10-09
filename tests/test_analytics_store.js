import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_analytics_store.js (Store Analytics Integration Suite)...');

// Setup globals
const mockElements = new Map();
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.scrollTo = () => {};
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};
globalThis.document = {
  body: {
    setAttribute() {},
    getAttribute() {},
    classList: { add() {}, remove() {} }
  },
  getElementById(id) {
    if (!mockElements.has(id)) {
      mockElements.set(id, { id, style: { display: 'none' } });
    }
    return mockElements.get(id);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {}
};
globalThis.location = { hash: '', pathname: '/', href: 'https://ihsg.badai.tech/' };
try {
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent: 'test-agent' },
    configurable: true,
    writable: true
  });
} catch (_) {}

// Mock Umami tracking
const events = [];
globalThis.umami = {
  track: (name, data) => {
    events.push({ name, data });
  }
};

const dataPath = fs.existsSync('public/shareholder_data.json') ? 'public/shareholder_data.json' : 'shareholder_data.json';
const realDataJson = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

globalThis.fetch = async (url, opts) => {
  if (url === 'shareholder_data.json' || url === '/shareholder_data.json' || url === 'data/shareholder_data.json') {
    return {
      ok: true,
      json: async () => realDataJson
    };
  }
  if (url === '/api/feedback') {
    return {
      ok: true,
      json: async () => ({ status: 'ok', ticket_id: 'TICK-12345' })
    };
  }
  return { ok: true, json: async () => ({}) };
};

const storePath = fs.existsSync('public/src/store.js') ? 'public/src/store.js' : 'src/store.js';
const { storeConfig } = await import(pathToFileURL(path.resolve(process.cwd(), storePath)).href);

// Test 1: boot tracks pageview once
await storeConfig.init();
const bootPageviews = events.filter(e => e.name === 'pageview');
assert.strictEqual(bootPageviews.length, 1, 'Boot should track pageview exactly once');
assert.strictEqual(bootPageviews[0].data.page, 'stocks');
console.log('  [PASS] Boot tracks pageview exactly once');

// Test 2: Tab switches DO NOT track pageview (M0-4 noise reduction)
storeConfig.setTab('investors');
storeConfig.setTab('analytics');
storeConfig.setTab('faq');
storeConfig.setTab('stocks');

const postTabSwitchPageviews = events.filter(e => e.name === 'pageview');
assert.strictEqual(postTabSwitchPageviews.length, 1, 'Tab switching must NOT dispatch pageview events (reduce noise per M0-4)');
console.log('  [PASS] Tab switching does not emit pageview events (noise reduction verified)');

// Test 3: submitFeedback triggers feedback_submit event
storeConfig.feedbackForm = {
  category: 'data_error',
  description: 'Adaro holder percentage calculation inquiry',
  issuer: 'AADI',
  reporter_contact: 'investor@example.com'
};
await storeConfig.submitFeedback();

assert.strictEqual(storeConfig.feedbackSuccess, true);
assert.strictEqual(storeConfig.feedbackTicketId, 'TICK-12345');

const feedbackEvents = events.filter(e => e.name === 'feedback_submit');
assert.strictEqual(feedbackEvents.length, 1, 'submitFeedback must trigger feedback_submit event');
assert.deepStrictEqual(feedbackEvents[0].data, { category: 'data_error' }, 'feedback_submit payload must contain category only (No PII)');
console.log('  [PASS] submitFeedback dispatches feedback_submit event with category only');

console.log('\n[ALL PASSED] Store analytics integration verified!');
