// tests/test_watchlist.js - Watchlist "Pantauan" (WL-4, P1): pure logic, store mixin, markup guards.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_watchlist.js (Watchlist Pantauan P1)...');

const mem = () => ({ store: {}, getItem(k) { return k in this.store ? this.store[k] : null; }, setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } });
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.localStorage = mem();
globalThis.sessionStorage = mem();
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.document = { getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {} };

const calls = [];
let handler = async () => ({ status: 404, body: {} });
globalThis.fetch = async (url, opts = {}) => {
  calls.push({ url: String(url), method: opts.method || 'GET', headers: opts.headers || {} });
  const r = await handler(String(url), opts);
  return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => { if (r.body === undefined) throw new Error('no body'); return r.body; } };
};

const url = (p) => pathToFileURL(path.resolve(process.cwd(), p)).href;
const read = (p) => fs.readFileSync(p, 'utf8');
const core = await import(url('public/src/watchlist-core.js'));
const { COPY } = await import(url('public/src/copy.js'));
const { watchlistMixin } = await import(url('public/src/watchlist.js'));
const unsub = await import(url('public/src/unsubscribe.js'));

// ---- 1. formatting: real minus, comma decimals, word + sign (never colour alone) ----
assert.strictEqual(core.fmtPoin(5.36), '+5,36 poin');
assert.strictEqual(core.fmtPoin(-15.86), '\u221215,86 poin');
assert.strictEqual(core.fmtPoin(0.001), '0,00 poin', 'tiny value has no sign');
assert.strictEqual(core.countText(16), '16 / 30');

// ---- 2. row states, data traps ----
const mk = (code, change, added = '2026-10-01T00:00:00') => ({ code, name: code + ' Tbk', added_at: added, change });
const up = mk('HATM', { status: 'changed', n_changes: 2, net_delta_pct: 5.36, flags: [] });
const dn = mk('LUCY', { status: 'changed', n_changes: 7, net_delta_pct: -15.86, flags: [] });
const ca = mk('FORU', { status: 'changed', n_changes: 3, net_delta_pct: 4.2, flags: ['corporate_action'] });
const tr = mk('TRNF', { status: 'changed', n_changes: 2, net_delta_pct: 9, flags: ['transfer'] });
const same = mk('BBCA', { status: 'unchanged', n_changes: 0, net_delta_pct: 0, flags: [] });
const nod = mk('GOTO', { status: 'no_data', n_changes: 0, net_delta_pct: 0, flags: [] });
const lst = mk('NEWI', { status: 'changed', n_changes: 1, net_delta_pct: 1.1, flags: ['listed'] });
const dlt = mk('OLDI', { status: 'changed', n_changes: 1, net_delta_pct: -1.1, flags: ['delisted'] });

let v = core.rowView(up);
assert.deepStrictEqual([v.kind, v.cls, v.main, v.sub, v.chip], ['changed', 'up', '+5,36 poin', 'naik', '2 pemegang berubah']);
v = core.rowView(dn);
assert.deepStrictEqual([v.cls, v.main, v.sub], ['dn', '\u221215,86 poin', 'turun']);
v = core.rowView(ca);
assert.deepStrictEqual([v.kind, v.cls, v.main, v.sub], ['ca', 'fl', 'Aksi korporasi', 'tidak dihitung'], 'corporate action: no coloured delta');
assert.ok(!/\d,\d\d poin/.test(v.main + v.sub), 'corporate action never prints a delta number');
v = core.rowView(tr);
assert.deepStrictEqual([v.kind, v.cls, v.main], ['ca', 'fl', 'Aksi korporasi'], 'transfer flag is treated like corporate action');
v = core.rowView(same);
assert.deepStrictEqual([v.kind, v.main, v.chip], ['unchanged', 'Tidak berubah', '']);
v = core.rowView(nod);
assert.deepStrictEqual([v.kind, v.main], ['nodata', 'Belum ada data']);
assert.strictEqual(core.rowView(lst).main, 'Baru tercatat');
assert.strictEqual(core.rowView(dlt).main, 'Dihapus dari bursa');
assert.strictEqual(core.rowView(lst).cls, 'fl');
assert.strictEqual(core.rowView({ code: 'XXXX', name: 'X' }).main, 'Belum ada data', 'missing change object is no_data, never a throw');
assert.strictEqual(core.rowView(mk('ZERO', { status: 'changed', n_changes: 2, net_delta_pct: 0, flags: [] })).cls, 'fl', 'net zero is not coloured');

// ---- 3. sorting + summary (A4: numbers add up) ----
const all = [same, nod, ca, dn, up, mk('OLD', { status: 'changed', n_changes: 1, net_delta_pct: 0.5, flags: [] }, '2026-09-01T00:00:00')];
const order = core.sortItems(all).map((i) => i.code);
assert.deepStrictEqual(order, ['LUCY', 'HATM', 'OLD', 'FORU', 'BBCA', 'GOTO'], 'changed by abs delta, then flagged, unchanged, no data');
assert.strictEqual(all[0].code, 'BBCA', 'input not mutated');
const tie = core.sortItems([mk('AAA', same.change, '2026-01-01'), mk('BBB', same.change, '2026-06-01')]).map((i) => i.code);
assert.deepStrictEqual(tie, ['BBB', 'AAA'], 'ties by added_at desc');
const s = core.summarize(all);
assert.deepStrictEqual([s.changed, s.same, s.ca], [3, 2, 1]);
assert.strictEqual(s.changed + s.same + s.ca, all.length);
assert.deepStrictEqual(core.summarize([]), { changed: 0, ca: 0, same: 0, total: 0 });

// ---- 4. period text ----
assert.deepStrictEqual(core.periodParts({ from_as_of: '2026-08-31', to_as_of: '2026-09-30', gap_days: 30, is_consecutive: true }), { from: '31 Agu', to: '30 Sep 2026', gap: '' });
assert.deepStrictEqual(core.periodParts({ from_as_of: '2026-05-29', to_as_of: '2026-09-30', gap_days: 124, is_consecutive: false }), { from: '29 Mei', to: '30 Sep 2026', gap: ' (4 bulan)' });
assert.strictEqual(core.periodParts({ from_as_of: '2025-12-31', to_as_of: '2026-01-30', gap_days: 30, is_consecutive: true }).from, '31 Des 2025', 'year shown on both when it differs');
assert.strictEqual(core.periodParts(null), null, 'pair=null is handled');

// ---- 5. error classification ----
assert.strictEqual(core.classifyError({ status: 409, data: { detail: { error: 'watchlist_full', limit: 30 } } }), 'full');
assert.strictEqual(core.classifyError({ status: 403, data: { detail: { error: 'tier_required', required_feature: 'watchlist' } } }), 'tier');
assert.strictEqual(core.classifyError({ status: 403, data: { detail: 'Account disabled' } }), 'error', 'other 403 is not a tier gate');
assert.strictEqual(core.classifyError({ status: 401, data: null }), 'auth');
assert.strictEqual(core.classifyError({ status: 404, data: null }), 'notfound');
assert.strictEqual(core.classifyError({ status: 0, data: null }), 'network');
assert.strictEqual(core.classifyError({ status: 500, data: null }), 'error');

// ---- 6. P2 flag defaults OFF ----
assert.strictEqual(core.alertsUiEnabled(), false);
localStorage.setItem('ihsg_wl_alerts', '1'); assert.strictEqual(core.alertsUiEnabled(), true); localStorage.removeItem('ihsg_wl_alerts');
location.search = '?wl_alerts=1'; assert.strictEqual(core.alertsUiEnabled(), true); location.search = '';

// ---- 7. store mixin: star flows against a fake API ----
function makeStore(extra = {}) {
  const st = {
    user: { uid: 'u1' }, userTier: 'pro', userProfile: { features: ['watchlist'], quota: { watchlist: { limit: 30, used: 0 } } },
    authRestoring: false, isPro: true, tierLoading: false, proOpen: false, proWhy: '', toasted: [], tab: '',
    openPro(why) { this.proOpen = true; this.proWhy = why; },
    setTab(t) { this.tab = t; },
    ...extra
  };
  const descs = Object.getOwnPropertyDescriptors(watchlistMixin);
  delete descs.wl;
  Object.defineProperties(st, descs);
  st.wl = { loading: false, loaded: false, error: false, lapsed: false, stale: false, items: [], codes: {}, pair: null, alerts: { email_alerts: false } };
  st._wlBusy = {}; st._wlToastTimer = null; st._wlEpoch = 0;
  st.wlGateSample = []; st.wlAlertsUi = false;
  st.wlAlert = { loaded: false, busy: false, email_alerts: false };
  st.wlToast = { on: false, msg: '', undo: false };
  return st;
}
const listBody = (codes) => ({ items: codes.map((c) => mk(c, same.change)), quota: { limit: 30, used: codes.length }, pair: { from_as_of: '2026-08-31', to_as_of: '2026-09-30', gap_days: 30, is_consecutive: true }, alerts: { email_alerts: false, consent_at: null } });

// Free user: star opens the gate, never a silent no-op, no write request.
let st = makeStore({ userProfile: { features: [] }, isPro: false });
calls.length = 0;
await st.wlToggle('KOTA');
assert.strictEqual(st.proOpen, true, 'A1: Free tap opens the gate sheet');
assert.strictEqual(st.proWhy, 'watchlist');
assert.strictEqual(calls.length, 0, 'Free never calls the API');
// Logged out
st = makeStore({ user: null, userProfile: null, isPro: false });
await st.wlToggle('KOTA');
assert.strictEqual(st.proOpen, true, 'logged out also gets the gate');
// Session still restoring: nothing fires
st = makeStore({ authRestoring: true });
calls.length = 0;
await st.wlToggle('KOTA');
assert.strictEqual(calls.length + (st.proOpen ? 1 : 0), 0, 'no gate flash while the session restores');

// Pro: add (201), count in toast, remove with Undo.
let server = ['BBCA'];
handler = async (u, o) => {
  const m = (o && o.method) || 'GET';
  if (m === 'GET' && u === '/api/v1/watchlist') return { status: 200, body: listBody(server) };
  const code = u.split('/').pop();
  if (m === 'PUT') { if (!server.includes(code)) server.push(code); return { status: 201, body: { code, name: code, added_at: 'x', quota: { limit: 30, used: server.length } } }; }
  if (m === 'DELETE') { server = server.filter((c) => c !== code); return { status: 204, body: undefined }; }
  return { status: 404, body: {} };
};
st = makeStore();
await st.wlToggle('KOTA');
assert.strictEqual(st.wlIsWatched('KOTA'), true);
assert.strictEqual(st.wlToast.msg, 'KOTA dipantau (2 dari 30)', 'A2: toast count from server quota');
assert.ok(calls.some((c) => c.method === 'PUT' && c.url === '/api/v1/watchlist/KOTA'));
assert.ok(calls.every((c) => !('Authorization' in c.headers) || /^Bearer /.test(c.headers.Authorization)));
await st.wlToggle('kota');
assert.strictEqual(st.wlIsWatched('KOTA'), false);
assert.strictEqual(st.wlToast.undo, true);
assert.strictEqual(st.wlToast.msg, 'KOTA dilepas dari Pantauan');
assert.strictEqual(st.wlRows.find((r) => r.code === 'KOTA').removing, true, 'row stays in place until the toast ends');
await st.wlToastUndoClick();
assert.strictEqual(st.wlIsWatched('KOTA'), true, 'A2: Undo re-adds');
assert.ok(server.includes('KOTA'));
// toast expiry drops the row
await st.wlToggle('KOTA');
st.wlToastHide();
assert.ok(!st.wl.items.some((i) => i.code === 'KOTA'), 'row leaves after the toast expires');
assert.strictEqual(st.wlToast.on, false);

// A3: 31st add. Local guard opens the full sheet without a request; server 409 is the safety net.
const thirty = Array.from({ length: 30 }, (_, i) => 'T' + String(i).padStart(3, '0'));
server = thirty.slice();
st = makeStore();
await st.wlLoad();
assert.strictEqual(st.wlCount, 30); assert.strictEqual(st.wlFull, true); assert.strictEqual(st.wlWarn, true);
calls.length = 0;
await st.wlToggle('ZZZZ');
assert.strictEqual(st.wlFullOpen, true, 'A3: full sheet at 30');
assert.strictEqual(calls.length, 0, 'no write when locally full');
assert.strictEqual(st.wlCount, 30);
// race: server says 409 although local count is 29
server = thirty.slice(0, 29);
st = makeStore(); await st.wlLoad();
handler = async (u, o) => (o.method === 'PUT' ? { status: 409, body: { detail: { error: 'watchlist_full', limit: 30 } } } : { status: 200, body: listBody(server) });
await st.wlToggle('ZZZZ');
assert.strictEqual(st.wlFullOpen, true, '409 watchlist_full shows the full sheet');
assert.strictEqual(st.wlIsWatched('ZZZZ'), false, 'optimistic add reverted');
assert.strictEqual(st.wlCount, 29);

// Write failure reverts + error toast; 404 and network too.
for (const status of [500, 404, 0]) {
  st = makeStore(); st.wl.loaded = true;
  handler = async () => { if (status === 0) throw new Error('offline'); return { status, body: {} }; };
  await st.wlToggle('KOTA');
  assert.strictEqual(st.wlIsWatched('KOTA'), false, `revert on ${status}`);
  assert.strictEqual(st.wlToast.msg, 'Gagal menyimpan. Coba lagi.');
}

// Pro lapsed: 403 tier_required on load keeps items server-side, UI shows the lapsed gate.
handler = async () => ({ status: 403, body: { detail: { error: 'tier_required', required_feature: 'watchlist' } } });
st = makeStore({ userProfile: { features: ['watchlist'], quota: { watchlist: { limit: 30, used: 7 } } } });
await st.wlLoad();
assert.strictEqual(st.wl.lapsed, true);
assert.strictEqual(st.wlMode, 'lapsed');
assert.strictEqual(st.wlLapsedCount, 7);
assert.strictEqual(st.wlT('lapsed', { n: st.wlLapsedCount }), 'Pantauan Anda tersimpan (7 saham). Aktifkan Pro lagi untuk melihatnya.');
// Load error is not mistaken for a gate
handler = async () => ({ status: 500, body: {} });
st = makeStore(); await st.wlLoad();
assert.strictEqual(st.wl.error, true); assert.strictEqual(st.wl.lapsed, false);
// pair=null -> no-data mode, no period
handler = async () => ({ status: 200, body: { ...listBody(['BBCA']), pair: null } });
st = makeStore(); await st.wlLoad();
assert.strictEqual(st.wlNoData, true); assert.strictEqual(st.wlPeriod, null); assert.strictEqual(st.wlQuiet, false);
// quiet month
handler = async () => ({ status: 200, body: listBody(['BBCA', 'BBRI']) });
st = makeStore(); await st.wlLoad();
assert.strictEqual(st.wlQuiet, true); assert.strictEqual(st.wlMode, 'list');
assert.strictEqual(st.wlPeriod.range, '31 Agu ke 30 Sep 2026');
// empty
handler = async () => ({ status: 200, body: listBody([]) });
st = makeStore(); await st.wlLoad();
assert.strictEqual(st.wlMode, 'empty'); assert.strictEqual(st.wlCountText, '0 / 30');
// logout clears memory
st.wl.items = [up]; st.wl.codes = { HATM: true }; st.wlUid = 'u1'; st.user = null;
st.wlClose = () => {}; st.wlOnAuthChange();
assert.deepStrictEqual(st.wl.items, []); assert.deepStrictEqual(st.wl.codes, {});

// ---- 8. alerts (P2 behind flag): default off, optimistic with revert ----
st = makeStore(); st.wlAlertsUi = true; st.wlAlert.loaded = true; st.wlAlert.email_masked = 'b***@gmail.com';
handler = async () => ({ status: 500, body: {} });
await st.wlAlertToggle();
assert.strictEqual(st.wlAlert.email_alerts, false, 'failed PUT reverts');
handler = async (u, o) => ({ status: 200, body: { email_alerts: JSON.parse(o.body).email_alerts, consent_at: 'now', unsubscribed_at: null, email_masked: 'b***@gmail.com' } });
await st.wlAlertToggle();
assert.strictEqual(st.wlAlert.email_alerts, true);
assert.strictEqual(st.wlAlert.msg, COPY.watchlist.alert.msg_on);
st.wlAlert.email_masked = null;
const before = calls.length; await st.wlAlertToggle();
assert.strictEqual(calls.length, before, 'no email on account: switch inert');

// ---- 9. unsubscribe page logic (A7) ----
assert.strictEqual(unsub.readToken('?t=abc.def'), 'abc.def');
assert.strictEqual(unsub.readToken(''), null);
assert.strictEqual(unsub.readToken('?t=' + 'x'.repeat(600)), null);
calls.length = 0;
assert.strictEqual(await unsub.submitUnsubscribe(null), 'bad');
assert.strictEqual(calls.length, 0, 'loading the page / missing token never calls the API');
const f = (status) => async (u, o) => { calls.push({ u, o }); return { ok: status < 300, status }; };
assert.strictEqual(await unsub.submitUnsubscribe('tok', f(200)), 'done');
assert.strictEqual(calls[0].o.method, 'POST'); assert.ok(calls[0].u.endsWith('/unsubscribe?t=tok'));
assert.strictEqual(await unsub.submitUnsubscribe('tok', f(400)), 'bad');
assert.strictEqual(await unsub.submitUnsubscribe('tok', f(503)), 'error');
assert.strictEqual(await unsub.submitUnsubscribe('tok', async () => { throw new Error('x'); }), 'error');
assert.strictEqual(unsub.viewFor('bad').title, 'Tautan tidak valid');
assert.strictEqual(unsub.viewFor('done').title, 'Selesai');

// ---- 10. copy contract + markup guards ----
const rows = COPY.pro_sheet.rows;
const wlRow = rows.find((r) => /pantau/i.test(r.feature));
assert.deepStrictEqual([wlRow.feature, wlRow.pro, wlRow.soon], ['Daftar pantau saham (sampai 30)', 'Ya', false], 'A9: P1 row live');
const mailRow = rows.find((r) => /Pengingat/.test(r.feature));
assert.deepStrictEqual([mailRow.pro, mailRow.soon], ['Segera', true], 'A9: reminder row stays Segera until P2');
assert.strictEqual(rows.length, 8);
assert.strictEqual(COPY.pro_gates.watchlist.title, 'Pantau saham pilihan Anda');
const W = COPY.watchlist;
assert.strictEqual(W.nav, 'Pantauan');
const flat = JSON.stringify(W);
assert.ok(!/\u2014/.test(flat), 'no em dashes in copy');
assert.ok(!/\b(beli|jual)\b/i.test(W.footnote.replace('bukan saran jual atau beli', '')), 'no buy/sell wording outside the disclaimer');

const html = read('public/index.html');
assert.ok(html.includes('id="v-watch"'), 'view exists');
assert.ok((html.match(/setTab\('watch'\)/g) || []).length === 2, 'tab in rail and bottom nav');
assert.ok((html.match(/aria-pressed="wlIsWatched\(cur\.arg\)"/g) || (html.match(/:aria-pressed="wlIsWatched\(cur\.arg\)"/g)) || []).length === 2, 'star in sheet and pane headers');
assert.ok(!/id="bnav"[\s\S]*openSearch\(\)[\s\S]*<\/nav>/.test(html.slice(html.indexOf('id="bnav"'), html.indexOf('</nav>', html.indexOf('id="bnav"')) + 6)), 'bottom nav is five items: Cari moved out (search stays in header)');
const bnav = html.slice(html.indexOf('id="bnav"'), html.indexOf('</nav>', html.indexOf('id="bnav"')));
assert.strictEqual((bnav.match(/class="nb"/g) || []).length, 5, 'bottom nav has 5 items');
const css = read('public/assets/css/style.css');
assert.ok(/\.star \{ width: 44px; height: 44px;/.test(css), 'star target 44px');
assert.ok(/\.wl-sw \{[^}]*min-height: 56px/.test(css), 'switch row >= 44px');
assert.ok(/\.wl-r \{[^}]*min-height: 64px/.test(css));
assert.ok(/\.wl-d \{[^}]*max-width: 112px/.test(css));
assert.ok(/\.toast\.wl-toast button \{[^}]*min-height: 44px/.test(css), 'undo target 44px');
const un = read('public/unsubscribe.html');
assert.ok(/noindex/.test(un) && !/<script(?![^>]*src)/.test(un), 'unsubscribe page: noindex, no inline script');
assert.ok(!/innerHTML/.test(read('public/src/unsubscribe.js')), 'unsubscribe page builds DOM with textContent only');
assert.ok(!/localStorage\.setItem|sessionStorage\.setItem/.test(read('public/src/watchlist.js') + read('public/src/watchlist-core.js')), 'watchlist data never persisted client side');

console.log('All test_watchlist.js assertions PASSED!');
