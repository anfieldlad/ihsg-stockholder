// tests/test_auth_settle_realtime.js — REAL timers (no clock compression), double init().
// Regression for: init() ran twice (Alpine auto-init + x-init), the second run saw the consumed
// sessionStorage flag and armed the 8s hint time-box, flashing Masuk at ~8s on slow phones.
// Takes ~26s of wall-clock time by design.
import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_auth_settle_realtime.js (real timers, ~26s)...');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
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
const toast = { textContent: '', on: false, classList: { add() { toast.on = true; }, remove() { toast.on = false; } } };
globalThis.document = {
  body: { setAttribute() {}, getAttribute() {}, classList: { add() {}, remove() {} } },
  getElementById(id) { return id === 'toast' ? toast : { id, style: {}, classList: { add() {}, remove() {} } }; },
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
};
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { pushState() {}, replaceState() {} };
globalThis.__markAppBooted = () => {};
let meCalls = 0;
globalThis.fetch = async (url) => {
  if (String(url).includes('shareholder_data.json')) return { ok: false, status: 503, json: async () => ({}) };
  if (String(url).includes('/api/v1/me')) {
    meCalls++;
    return { ok: true, json: async () => ({ tier: 'pakar', user: { email: 'a@b.c' }, entitlement: null }) };
  }
  return { ok: false, json: async () => ({}) };
};

const url = (p) => pathToFileURL(path.resolve(process.cwd(), p)).href;
const auth = await import(url('public/src/auth.js'));
const { storeConfig: store } = await import(url('public/src/store.js'));

async function run(redirectMs, observeMs) {
  auth._resetAuthForTesting();
  localStorage.store = {}; sessionStorage.store = {};
  sessionStorage.setItem('ihsg_auth_pending_redirect', '1');
  toast.on = false; toast.textContent = ''; meCalls = 0;
  Object.assign(store, { user: null, userTier: 'gratis', akunOpen: false, _initDone: false });
  store.authRestoring = auth.shouldRestoreAuth();
  const calls = {};
  const fakeUser = { uid: 'u1', email: 'a@b.c', getIdToken: async () => 'tok' };
  auth.setFirebaseSdkForTesting({
    getApps: () => [], initializeApp: () => ({}), getApp: () => ({}), getAuth: () => ({}),
    onAuthStateChanged: (_a, cb) => { calls.cb = cb; },
    getRedirectResult: async () => {
      if (redirectMs === Infinity) return new Promise(() => {});
      await sleep(redirectMs);
      if (calls.cb) calls.cb(fakeUser);
      return { user: fakeUser };
    },
    signOut: async () => {}
  });
  const t0 = Date.now();
  let masukAt = null, avatarAt = null;
  const sampler = setInterval(() => {
    const now = Date.now() - t0;
    if (!store.authRestoring && !store.user && masukAt === null) masukAt = now;
    if (store.user && avatarAt === null) avatarAt = now;
  }, 50);
  // Alpine auto-init AND the old x-init="init()": two calls.
  const p = Promise.all([store.init(), store.init()]);
  await sleep(observeMs);
  await p;
  clearInterval(sampler);
  return { masukAt, avatarAt };
}

// 1. redirect resolves after 10s (> 8s hint cap): Masuk must never render before the user.
{
  const r = await run(10000, 11500);
  assert.strictEqual(r.masukAt, null, `Masuk must never render (got at ${r.masukAt}ms)`);
  assert(r.avatarAt !== null && r.avatarAt >= 9900 && r.avatarAt < 11000, `avatar right after redirect resolves (at ${r.avatarAt}ms)`);
  assert.strictEqual(meCalls, 1, `/me once (got ${meCalls})`);
  console.log('  [PASS] real 10s redirect, double init(): no Masuk, avatar at', r.avatarAt, 'ms');
}

// 2. redirect never resolves: no Masuk at 14s (no 8s flash), Masuk + toast at the 15s cap.
{
  const r = await run(Infinity, 15600);
  assert(r.masukAt !== null && r.masukAt >= 14800, `Masuk only at the 15s cap (at ${r.masukAt}ms)`);
  assert.strictEqual(toast.textContent, 'Login gagal, coba lagi');
  assert.strictEqual(toast.on, true);
  console.log('  [PASS] real 15s cap: Masuk at', r.masukAt, 'ms + toast');
}

auth._resetAuthForTesting();
console.log('test_auth_settle_realtime.js: all checks passed');
process.exit(0);
