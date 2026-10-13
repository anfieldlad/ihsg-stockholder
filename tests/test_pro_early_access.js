// tests/test_pro_early_access.js — Pro sheet early-access states (t_6783dfd9).
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_pro_early_access.js...');

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
globalThis.document = {
  body: { setAttribute() {}, getAttribute() {}, classList: { add() {}, remove() {} } },
  getElementById() { return { style: {}, classList: { add() {}, remove() {} } }; },
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
};
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { pushState() {}, replaceState() {} };
globalThis.__markAppBooted = () => {};

let calls = 0;
let mode = { ok: true, body: { seats_total: 5, seats_left: 4 } };
globalThis.fetch = async (u) => {
  if (String(u).includes('/api/v1/early-access')) {
    calls++;
    if (mode.throw) throw new Error('net');
    return { ok: mode.ok, json: async () => mode.body };
  }
  return { ok: false, json: async () => ({}) };
};

const url = (p) => pathToFileURL(path.resolve(process.cwd(), p)).href;
const { storeConfig: store } = await import(url('public/src/store.js'));
const { COPY } = await import(url('public/src/copy.js'));
const html = fs.readFileSync('public/index.html', 'utf8');

const fresh = () => { store.earlyAccess = { seatsLeft: null, at: 0 }; calls = 0; store.proOpen = false; };
store.authRestoring = false;
store.user = null;
store.userTier = 'gratis';

// 1. Signed out + seats left: enabled CTA + info line with N
fresh(); mode = { ok: true, body: { seats_total: 5, seats_left: 4 } };
store.openPro('top');
await new Promise((r) => setTimeout(r, 5));
assert.strictEqual(calls, 1, 'fetches /early-access when sheet opens');
assert.strictEqual(store.proEaState, 'cta');
assert.strictEqual(store.proEaNote,
  'Pro belum dibuka untuk umum. 5 pengguna pertama yang masuk dengan Google otomatis dapat Pro (sisa 4 kursi).');
assert.strictEqual(COPY.pro_sheet.cta_early_access, 'Masuk dengan Google, dapat Pro gratis');

// 1b. cached: reopening within TTL does not refetch
store.proOpen = false; store.openPro('top'); await new Promise((r) => setTimeout(r, 5));
assert.strictEqual(calls, 1, 'cached briefly');
store.earlyAccess.at = Date.now() - 61000;
store.proOpen = false; store.openPro('top'); await new Promise((r) => setTimeout(r, 5));
assert.strictEqual(calls, 2, 'refetch after TTL');

// 2. Signed in Free + seats left: info line, no CTA
store.user = { uid: 'u' };
assert.strictEqual(store.proEaState, 'info');
assert.match(store.proEaNote, /sisa 4 kursi/);
// 2b. restoring session: no CTA yet
store.user = null; store.authRestoring = true;
assert.strictEqual(store.proEaState, 'unknown');
store.authRestoring = false;

// 3. Full
fresh(); mode = { ok: true, body: { seats_total: 5, seats_left: 0 } };
store.openPro('top'); await new Promise((r) => setTimeout(r, 5));
assert.strictEqual(store.proEaState, 'full');
assert.strictEqual(store.proEaNote, 'Kursi akses awal sudah penuh.');
store.user = { uid: 'u' };
assert.strictEqual(store.proEaState, 'full', 'full also for signed-in Free');
store.user = null;

// 4. Failure is silent and leaves the safe default (disabled button, empty note)
for (const m of [{ ok: false, body: {} }, { throw: true }, { ok: true, body: { seats_left: 'x' } }, { ok: true, body: { seats_left: -1 } }]) {
  fresh(); mode = m;
  store.openPro('top'); await new Promise((r) => setTimeout(r, 5));
  assert.strictEqual(store.proOpen, true, 'sheet still opens on failure');
  assert.strictEqual(store.proEaState, 'unknown');
  assert.strictEqual(store.proEaNote, '');
}

// 5. Already Pro: no sheet, no fetch; Akun shows the end date
fresh(); mode = { ok: true, body: { seats_total: 5, seats_left: 4 } };
store.userTier = 'pakar';
store.openPro('top');
assert.strictEqual(store.proOpen, false, 'Pro gets no upsell');
assert.strictEqual(calls, 0, 'no fetch for Pro');
store.userProfile = { user: { email: 'a@b.c' }, tier: 'pakar', entitlement: { ends_at: '2027-01-11T05:00:00+00:00', source: 'early_access' } };
assert.match(store.akunValidity, /11 Januari 2027/);
store.userTier = 'gratis';

// 6. Markup: CTA wired to login(), only enabled in 'cta'; note slot always rendered (no layout shift)
assert(html.includes(`:disabled="proEaState !== 'cta' || authLoading"`), 'button disabled unless cta');
assert(html.includes(`@click="proEaState === 'cta' && login()"`), 'CTA starts existing Google sign-in');
assert(html.includes('id="proEaNote"') && !/id="proEaNote"[^>]*x-show/.test(html) && !/id="proEaNote"[^>]*x-if/.test(html), 'note element always in DOM');
const css = fs.readFileSync('public/assets/css/style.css', 'utf8');
assert(/\.pro-ea-note\s*\{[^}]*min-height:\s*2\.8em/.test(css), 'note slot has reserved height');

// 7. No promised duration in early-access copy
for (const k of ['cta_early_access', 'ea_open', 'ea_full']) assert(!/hari|bulan/i.test(COPY.pro_sheet[k]), `${k} has no duration`);

console.log('test_pro_early_access.js: all checks passed');
