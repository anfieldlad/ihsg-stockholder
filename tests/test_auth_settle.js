// tests/test_auth_settle.js — regression for escaped defect #2 (Masuk shown after Google redirect).
// Uses DELAYED mocks (getRedirectResult 6s, /me 3s) on a scaled clock (1 virtual ms = 1/100 real ms).
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_auth_settle.js (auth settle after redirect, delayed mocks)...');

const SCALE = 20;
const realSetTimeout = globalThis.setTimeout.bind(globalThis);
const realNow = () => performance.now();
globalThis.setTimeout = (fn, ms = 0, ...args) => realSetTimeout(fn, ms / SCALE, ...args);
const sleep = (ms) => new Promise((r) => globalThis.setTimeout(r, ms));
let t0 = realNow();
const vnow = () => (realNow() - t0) * SCALE;

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
const toast = { id: 'toast', textContent: '', classList: { add() { toast.on = true; }, remove() { toast.on = false; } }, on: false };
globalThis.document = {
  body: { setAttribute() {}, getAttribute() {}, classList: { add() {}, remove() {} } },
  getElementById(id) { return id === 'toast' ? toast : { id, style: {}, classList: { add() {}, remove() {} } }; },
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
};
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { pushState() {}, replaceState() {} };
globalThis.__markAppBooted = () => {};
let meCalls = 0;
let meDelay = 3000;
globalThis.fetch = async (url) => {
  // Data load is irrelevant here; its CPU time would distort the scaled clock.
  if (String(url).includes('shareholder_data.json')) return { ok: false, status: 503, json: async () => ({}) };
  if (String(url).includes('/api/v1/me')) {
    meCalls++;
    await sleep(meDelay);
    return { ok: true, json: async () => ({ tier: 'pakar', user: { email: 'a@b.c' }, entitlement: null }) };
  }
  return { ok: false, json: async () => ({}) };
};

const url = (p) => pathToFileURL(path.resolve(process.cwd(), p)).href;

// --- 0. Module-load smoke ---
const auth = await import(url('public/src/auth.js'));
for (const n of ['hasPendingRedirect', 'initAuth', 'subscribeAuth']) {
  assert.strictEqual(typeof auth[n], 'function', `auth.js exports ${n}`);
}
assert.strictEqual(auth.REDIRECT_CAP_MS, 15000, 'redirect hard cap is 15s');
assert.strictEqual(auth.HINT_RESTORE_CAP_MS, 8000, 'hint-only cap is 8s');
const { storeConfig: store } = await import(url('public/src/store.js'));
const html = fs.readFileSync('public/index.html', 'utf8');
assert(html.includes('tierLoading'), 'header has a tier skeleton bound to tierLoading');
console.log('  [PASS] module-load smoke');

function mockSdk(getRedirectResult, calls) {
  return {
    getApps: () => [], initializeApp: () => ({}), getApp: () => ({}), getAuth: () => ({}),
    // Real SDK also fires onAuthStateChanged with the user once the redirect resolves.
    onAuthStateChanged: (_a, cb) => { calls.cb = cb; },
    getRedirectResult,
    signOut: async () => {}
  };
}

async function scenario(redirectMs) {
  auth._resetAuthForTesting();
  localStorage.store = {}; sessionStorage.store = {};
  sessionStorage.setItem('ihsg_auth_pending_redirect', '1');
  localStorage.setItem('ihsg_auth_hint', '1');
  meCalls = 0; toast.on = false; toast.textContent = '';
  store.user = null; store.userTier = 'gratis'; store.akunOpen = false;
  store.authRestoring = auth.shouldRestoreAuth();
  const calls = {};
  const fakeUser = { uid: 'u1', email: 'a@b.c', getIdToken: async () => 'tok' };
  auth.setFirebaseSdkForTesting(mockSdk(async () => {
    if (redirectMs === Infinity) return new Promise(() => {});
    await sleep(redirectMs);
    // SDK fires both paths for the same user
    if (calls.cb) calls.cb(fakeUser);
    return { user: fakeUser };
  }, calls));
  t0 = realNow();
  const timeline = [];
  let masukSeen = null, avatarAt = null, tierAt = null;
  // sampler: setInterval is unscaled, 0.5 real ms ~ 50 virtual ms
  const sampler2 = setInterval(() => {
    const masuk = !store.authRestoring && !store.user;
    if (masuk && masukSeen === null) masukSeen = vnow();
    if (store.user && avatarAt === null) avatarAt = vnow();
    if (store.user && store.userTier === 'pakar' && tierAt === null) tierAt = vnow();
  }, 2);
  const initP = store.init();
  return { initP, sampler2, getState: () => ({ masukSeen, avatarAt, tierAt }) };
}

// --- 1. Delayed: redirect 6s, /me 3s ---
{
  meDelay = 3000;
  const s = await scenario(6000);
  await sleep(5500);
  assert.strictEqual(s.getState().masukSeen, null, 'Masuk must not render while redirect is pending (5.5s)');
  assert.strictEqual(store.authRestoring, true, 'placeholder still shown at 5.5s (old 4s time-box removed)');
  await sleep(1500); // t = 7s: user resolved at 6s, /me still pending until 9s
  const st = s.getState();
  assert(st.avatarAt !== null && st.avatarAt < 6500, `avatar shows as soon as user resolves (at ~${Math.round(st.avatarAt)}ms)`);
  assert.strictEqual(store.userTier, 'loading', 'tier is loading while /me pending');
  assert.strictEqual(store.tierLoading, true, 'tier skeleton shows');
  assert.strictEqual(store.userTierLabel, '', 'no tier label while loading');
  await sleep(3500); // t = 10.5s
  assert.strictEqual(store.userTier, 'pakar', 'tier applied after /me');
  assert.strictEqual(store.isPro, true);
  assert.strictEqual(s.getState().masukSeen, null, 'Masuk never rendered during the whole flow');
  assert.strictEqual(meCalls, 1, `/me fetched exactly once (got ${meCalls})`);
  clearInterval(s.sampler2);
  console.log('  [PASS] redirect 6s + /me 3s: no Masuk, instant avatar, /me once');
}

// --- 2. /me failure -> Gratis ---
{
  auth._resetAuthForTesting();
  const prev = globalThis.fetch;
  const base = prev;
  globalThis.fetch = async (u, o) => String(u).includes('/api/v1/me') ? (meCalls++, { ok: false, status: 503, json: async () => ({}) }) : base(u, o);
  const s = await scenario(100);
  await sleep(500);
  assert(store.user, 'user present after /me failure');
  assert.strictEqual(store.userTier, 'gratis', '/me failure => Gratis');
  clearInterval(s.sampler2);
  globalThis.fetch = base;
  console.log('  [PASS] /me failure -> Gratis');
}

// --- 3. Cap: redirect never resolves -> Masuk at 15s + toast ---
{
  const s = await scenario(Infinity);
  await sleep(14000);
  assert.strictEqual(s.getState().masukSeen, null, 'no Masuk before 15s');
  assert.strictEqual(store.authRestoring, true, 'placeholder at 14s');
  assert.strictEqual(toast.on, false, 'no toast before cap');
  await sleep(1500); // 15.5s
  const st = s.getState();
  assert(st.masukSeen !== null && st.masukSeen >= 14900, `Masuk appears at the 15s cap (at ~${Math.round(st.masukSeen)}ms)`);
  assert.strictEqual(toast.textContent, 'Login gagal, coba lagi', 'cap toast text');
  assert.strictEqual(toast.on, true, 'toast shown');
  clearInterval(s.sampler2);
  console.log('  [PASS] cap: Masuk + toast at 15s');
}

// --- 4. Hint-only path keeps a time-box, now 8s ---
{
  auth._resetAuthForTesting();
  localStorage.store = {}; sessionStorage.store = {};
  localStorage.setItem('ihsg_auth_hint', '1');
  store.user = null; store.authRestoring = auth.shouldRestoreAuth();
  auth.setFirebaseSdkForTesting(mockSdk(async () => null, {}));
  assert.strictEqual(auth.hasPendingRedirect(), false, 'hint only => no pending redirect');
  await store.init();
  await sleep(7000);
  assert.strictEqual(store.authRestoring || !!store.user, true, 'hint-only placeholder still shown at 7s (8s cap)');
  await sleep(1500);
  assert.strictEqual(store.authRestoring, false, 'hint-only placeholder gone after 8s');
  console.log('  [PASS] hint-only cap is 8s');
}

auth._resetAuthForTesting();
console.log('test_auth_settle.js: all checks passed');
process.exit(0);
