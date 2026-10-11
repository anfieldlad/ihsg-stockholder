// tests/test_pro_aware.js — M-A regression tests (Pro-aware UI).
// Covers: Pakar/Investor tier -> "Pro", no locks for Pro, auth placeholder (no Masuk flash),
// copy has no Investor/Pakar tier strings, module-load smoke.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_pro_aware.js (M-A Pro-aware UI regression)...');

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
  getElementById(id) { if (!els.has(id)) els.set(id, { id, style: {}, classList: { add() {}, remove() {} } }); return els.get(id); },
  querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
};
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { pushState() {}, replaceState() {} };
globalThis.__markAppBooted = () => {};
const data = JSON.parse(fs.readFileSync('public/shareholder_data.json', 'utf8'));
globalThis.fetch = async (url) => {
  if (String(url).includes('shareholder_data.json')) return { ok: true, json: async () => data };
  return { ok: false, json: async () => ({}) };
};

const url = (p) => pathToFileURL(path.resolve(process.cwd(), p)).href;
const read = (p) => fs.readFileSync(p, 'utf8');

// --- 1. Module-load smoke (store.js + auth.js) with the auth hint ABSENT ---
const auth = await import(url('public/src/auth.js'));
assert.strictEqual(typeof auth.shouldRestoreAuth, 'function', 'auth.js exports shouldRestoreAuth');
assert.strictEqual(auth.shouldRestoreAuth(), false, 'no hint => no restore');

// --- 2. shouldRestoreAuth: hint and pending redirect, storage untouched ---
sessionStorage.setItem('ihsg_auth_pending_redirect', '1');
assert.strictEqual(auth.shouldRestoreAuth(), true, 'pending redirect => restore');
assert.strictEqual(sessionStorage.getItem('ihsg_auth_pending_redirect'), '1', 'shouldRestoreAuth must not clear the pending flag');
sessionStorage.removeItem('ihsg_auth_pending_redirect');
localStorage.setItem('ihsg_auth_hint', '1');
assert.strictEqual(auth.shouldRestoreAuth(), true, 'hint => restore');
assert.strictEqual(localStorage.getItem('ihsg_auth_hint'), '1', 'shouldRestoreAuth must not clear the hint');

// subscribeAuth carries ready:false before auth resolves
let first;
auth.subscribeAuth((s) => { first = s; });
assert.strictEqual(first.ready, false, 'auth state is not ready before resolve');
auth._resetAuthForTesting();

// --- 3. Auth placeholder: store boots with hint => restoring, not Masuk ---
const { storeConfig: store } = await import(url('public/src/store.js'));
assert.strictEqual(store.authEnabled, true, 'auth enabled by default');
assert.strictEqual(store.authRestoring, true, 'hint set => authRestoring true at boot');
assert.strictEqual(store.user, null);

const html = read('public/index.html');
const skelIdx = html.indexOf('x-if="authRestoring && !user"');
const masukIdx = html.indexOf('x-if="!authRestoring && !user"');
assert(skelIdx > 0, 'header has a skeleton template for the restoring state');
assert(masukIdx > skelIdx, 'Masuk button only renders when not restoring');
assert(html.includes('x-show="!isPro && !authRestoring"'), 'PRO button hidden for Pro and while restoring');
assert(!html.includes('auth-logout'), 'Keluar no longer lives in the header');

// Resolve auth with no user (hint removed => final signed-out answer): placeholder ends.
localStorage.removeItem('ihsg_auth_hint');
await store.init();
await new Promise((r) => setTimeout(r, 20));
assert.strictEqual(store.authRestoring, false, 'auth resolved without user => placeholder cleared (Masuk may show)');

// --- 4. Tier 'pakar' => label Pro, isPro true, no locks, full lists ---
for (const t of ['pakar', 'investor', 'pro', 'PAKAR']) {
  store.userTier = t;
  assert.strictEqual(store.isPro, true, `${t} isPro`);
  assert.strictEqual(store.formatTierLabel(t), 'Pro', `${t} label is Pro`);
}
for (const t of ['gratis', undefined, null, '', 'basic']) {
  store.userTier = t;
  assert.strictEqual(store.isPro, false, `${String(t)} is not Pro`);
  assert.strictEqual(store.formatTierLabel(t), 'Gratis');
}

const biggest = Object.values(store.stockMap).sort((a, b) => b.holders.length - a.holders.length)[0];
const bigInv = Object.values(store.investorMap).sort((a, b) => b.holdings.length - a.holdings.length)[0];
assert(biggest.holders.length > 5 && bigInv.holdings.length > 8, 'fixture has >5 holders and >8 holdings');

// Free
store.userTier = 'gratis';
store.cur = { kind: 'stock', arg: biggest.code };
assert.strictEqual(store.detailStock.listHolders.length, 5, 'Free sees top 5 holders');
store.cur = { kind: 'investor', arg: bigInv.name };
assert.strictEqual(store.detailInvestor.listHoldings.length, 8, 'Free sees 8 holdings');
store.invLimit = 100;
assert.strictEqual(store.visibleInvestors.length, 20, 'Free ranking capped at 20');
assert.strictEqual(store.invCapped, true, 'Free ranking shows the lock');

// Pro (tier pakar from backend)
store.userTier = 'pakar';
store.cur = { kind: 'stock', arg: biggest.code };
assert.strictEqual(store.detailStock.listHolders.length, biggest.holders.length, 'Pro sees all holders');
assert.strictEqual(store.detailStock.holders.length, 5, 'donut data stays top 5');
store.cur = { kind: 'investor', arg: bigInv.name };
assert.strictEqual(store.detailInvestor.listHoldings.length, bigInv.holdings.length, 'Pro sees the full portfolio');
assert.strictEqual(store.visibleInvestors.length, Math.min(100, store.filteredInvestors.length), 'Pro ranking not capped');
assert.strictEqual(store.invCapped, false, 'Pro ranking has no lock');

// Every lock card in the markup is gated by !isPro / invCapped
const lockTags = html.match(/<div class="lock"[^>]*>/g) || [];
assert(lockTags.length >= 5, 'lock cards exist in markup');
for (const tag of lockTags) {
  assert(/x-show="(!isPro|invCapped)/.test(tag), `lock card is hidden for Pro: ${tag}`);
}

// Pro cannot open the Pro sheet; freshness opens Info for everyone
store.proOpen = false;
store.openPro('screener');
assert.strictEqual(store.proOpen, false, 'Pro never opens the Pro sheet');
store.userTier = 'gratis';
store.openPro('freshness');
assert.strictEqual(store.proOpen, false, 'freshness never opens the Pro sheet');
assert.strictEqual(store.infoOpen, true, 'freshness opens the Info sheet');
store.closeInfo();
store.openPro('screener');
assert.strictEqual(store.proOpen, true, 'Free still opens the Pro sheet');
store.proOpen = false;

// Akun validity
store.userTier = 'pakar';
store.userProfile = { user: { email: 'a@b.c', display_name: 'Bobby' }, tier: 'pakar', entitlement: { ends_at: null, source: 'founder' } };
assert.strictEqual(store.akunValidity, 'Seumur hidup', 'lifetime');
store.userProfile.entitlement.ends_at = '2027-10-11T05:00:00+00:00';
assert.match(store.akunValidity, /11 Oktober 2027/, 'ends_at in Indonesian format');
store.userProfile.entitlement.ends_at = 'garbage';
assert.strictEqual(store.akunValidity, '', 'invalid date hides the row');
store.userTier = 'gratis';
store.userProfile = { user: { email: 'a@b.c' }, tier: 'gratis', entitlement: null };
assert.strictEqual(store.akunValidity, '', 'Free has no validity row');

// --- 5. Copy and UI files contain no Investor/Pakar tier strings ---
const copyMod = await import(url('public/src/copy.js'));
const copyJson = JSON.stringify(copyMod.COPY);
for (const bad of ['Pakar', 'Trader', 'Layanan Berlangganan', 'Lihat Paket', 'tier_investor']) {
  assert(!copyJson.includes(bad), `COPY has no "${bad}"`);
}
assert(!/"(investor|trader)":"/.test(JSON.stringify(copyMod.COPY.pro_sheet)), 'pro_sheet has no investor/trader columns');
const uiFiles = ['public/index.html', 'public/assets/css/style.css', ...fs.readdirSync('public/src').map((f) => 'public/src/' + f)];
for (const f of uiFiles) {
  const txt = read(f);
  for (const bad of ['Pakar', 'Trader', 'tier-investor', 'tier-pakar', 'Layanan Berlangganan', 'Lihat Paket']) {
    assert(!txt.includes(bad), `${f} must not contain "${bad}"`);
  }
}
assert(!/>\s*Investor\s*<\/th>/.test(html), 'no Investor tier column in Pro sheet');


// --- 6. Redirect path: a null onAuthStateChanged must not mark ready (no Masuk flash) ---
{
  auth._resetAuthForTesting();
  sessionStorage.setItem('ihsg_auth_pending_redirect', '1');
  const seen = [];
  let release;
  const gate = new Promise((r) => { release = r; });
  const fakeUser = { getIdToken: async () => 'tok', email: 'a@b.c' };
  auth.setFirebaseSdkForTesting({
    getApps: () => [], initializeApp: () => ({}), getApp: () => ({}), getAuth: () => ({}),
    onAuthStateChanged: (_a, cb) => { setTimeout(() => cb(null), 0); },
    getRedirectResult: async () => { await gate; return { user: fakeUser }; },
    signOut: async () => {}
  });
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ tier: 'pakar', user: { email: 'a@b.c' }, entitlement: null }) });
  auth.subscribeAuth((s) => seen.push({ user: !!s.user, ready: s.ready }));
  const p = auth.initAuth();
  await new Promise((r) => setTimeout(r, 30));
  assert(seen.every((s) => s.ready === false), 'null auth event during pending redirect must not set ready');
  release();
  await p;
  const last = seen[seen.length - 1];
  assert(last.user && last.ready, 'redirect result delivers user with ready=true');
  assert(!seen.some((s) => s.ready && !s.user), 'never a ready-without-user state on the redirect path');
  auth._resetAuthForTesting();
  auth.setFirebaseSdkForTesting(null);
}

console.log('test_pro_aware.js: all checks passed');
