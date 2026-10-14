// tests/test_f1_diff.js — F1 diff UI: formatting, row view models, gating, request behaviour, markup guards.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_f1_diff.js (F1 diff UI)...');

const mem = () => ({ store: {}, getItem(k) { return k in this.store ? this.store[k] : null; }, setItem(k, v) { this.store[k] = String(v); }, removeItem(k) { delete this.store[k]; } });
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.localStorage = mem();
globalThis.sessionStorage = mem();
globalThis.document = {
  body: { setAttribute() {} }, activeElement: null,
  getElementById() { return null; }, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}
};
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { pushState() {}, replaceState() {} };
const data = JSON.parse(fs.readFileSync('public/shareholder_data.json', 'utf8'));
const calls = [];
let handler = async () => ({ ok: false, status: 404, json: async () => ({}) });
globalThis.fetch = async (url, opts) => {
  if (String(url).includes('shareholder_data.json')) return { ok: true, json: async () => data };
  calls.push({ url: String(url), headers: (opts && opts.headers) || {} });
  return handler(String(url), opts);
};
const url = (p) => pathToFileURL(path.resolve(process.cwd(), p)).href;
const read = (p) => fs.readFileSync(p, 'utf8');

const D = await import(url('public/src/diff.js'));
const { COPY } = await import(url('public/src/copy.js'));
const auth = await import(url('public/src/auth.js'));
const { storeConfig: store } = await import(url('public/src/store.js'));

// ---- 1. formatting (spec 5 + 15.6) ----
assert.strictEqual(D.fmtPP(0.42), '+0,42 pp');
assert.strictEqual(D.fmtPP(-0.09), '\u22120,09 pp', 'U+2212 minus');
assert.strictEqual(D.fmtPP(0.001), '0,00 pp', 'tiny value never prints a sign');
assert.strictEqual(D.comp(38200000, true), '+38,2 jt');
assert.strictEqual(D.comp(-1950000000, true), '\u22121,95 mlr');
assert.strictEqual(D.comp(642700000, true), '+642,7 jt');
assert.strictEqual(D.comp(12400), '12,4 rb');
assert.strictEqual(D.comp(999), '999');
assert.strictEqual(D.comp(999960), '1,0 jt', 'rounding that would print 1.000,0 rb promotes to jt');
assert.strictEqual(D.comp(999960000), '1,00 mlr', 'same for jt -> mlr');
assert.strictEqual(D.fmtInt(1976632710), '1.976.632.710');
assert.strictEqual(D.fmtDateId('2026-09-30'), '30 Sep 2026');
assert.strictEqual(D.fmtDateId('2026-05-29'), '29 Mei 2026');
assert.strictEqual(D.fmtDateId('2026-08-31'), '31 Agu 2026');
assert.strictEqual(D.monthLabel('2026-05-29'), 'Mei 2026');
assert.strictEqual(D.gapMonths(123), 4);
assert.strictEqual(D.gapMonths(30), 1);

// ---- 2. row view models: every v2 state ----
const base = { code: 'BBCA', issuer: 'BANK CENTRAL ASIA Tbk', investor: 'PT DWIMURIA INVESTAMA ANDALAN', investor_type: 'CP', local_foreign: 'L',
  prev_shares: 1950000000, curr_shares: 1976632710, delta_shares: 26632710, prev_pct: 6.64, curr_pct: 6.73, delta_pct: 0.09,
  prev_date: '2026-08-31', curr_date: '2026-09-30', possible_corporate_action: false, merged_rows_changed: false, type_changed: false, corporate_action: false, transfer: false };
const tn = (t) => ({ CP: 'Korporasi' }[t] || t);

let v = D.rowView({ ...base, status: 'INCREASE' }, tn);
assert.strictEqual(v.tags[0].text, 'Naik');
assert.strictEqual(v.ppText, '+0,09 pp');
assert.strictEqual(v.ppCls, 'up');
assert.strictEqual(v.sharesText, '+26,6 jt lembar');
assert.strictEqual(v.pctLine, '6,64% \u2192 6,73%');
assert.strictEqual(v.exact.delta, '+26.632.710');
assert.strictEqual(v.exact.prevDate, '31 Agu 2026');
assert.strictEqual(v.meta, 'Korporasi \u00b7 Domestik');
assert.ok(/naik 0,09 poin persentase/.test(v.aria));

v = D.rowView({ ...base, status: 'DECREASE', delta_shares: -5000000, delta_pct: -0.2 }, tn);
assert.strictEqual(v.ppText, '\u22120,20 pp');
assert.strictEqual(v.ppCls, 'down');

v = D.rowView({ ...base, status: 'NEW', prev_shares: 0, prev_pct: null, curr_pct: 1.12, delta_shares: 65200000, delta_pct: 1.12 }, tn);
assert.strictEqual(v.tags[0].text, 'Masuk >1%');
assert.strictEqual(v.pctLine, 'baru \u2192 1,12%');
assert.strictEqual(v.sharesText, '+65,2 jt lembar', 'NEW rows are signed + unit word');

v = D.rowView({ ...base, status: 'EXIT', prev_pct: 1.05, curr_pct: null, delta_shares: -50000000, delta_pct: -1.05 }, tn);
assert.strictEqual(v.pctLine, '1,05% \u2192 <1%');
assert.strictEqual(v.ppCls, 'down');

v = D.rowView({ ...base, status: 'ENTITY_CHANGE', delta_shares: 0, delta_pct: 0, prev_investor: 'PT LAMA NAMA', name_overlap: false }, tn);
assert.strictEqual(v.tags[0].text, 'Pindah nama');
assert.strictEqual(v.ppText, 'tidak dihitung');
assert.strictEqual(v.sharesText, '0 lembar');
assert.ok(/sebelumnya PT Lama Nama/.test(v.extra));
assert.ok(v.notes.some((n) => /Tidak dihitung sebagai Masuk atau Keluar/.test(n)));
assert.ok(!/up|down/.test(v.ppCls), 'entity change never uses buy/sell colours');

v = D.rowView({ ...base, status: 'DILUTED', prev_pct: 1.4, curr_pct: null, delta_shares: 0, delta_pct: -1.4 }, tn);
assert.strictEqual(v.tags[0].text, 'Turun <1%');
assert.strictEqual(v.ppText, 'turun <1%');
assert.strictEqual(v.pctLine, '1,40% \u2192 <1%');
assert.ok(/bukan dijual/.test(v.extra));
assert.strictEqual(v.ppCls, 'zero');

v = D.rowView({ ...base, status: 'INCREASE', corporate_action: true, issuer_shares_change_pct: 38.5 }, tn);
assert.ok(v.tags.some((t) => t.text === 'Aksi korporasi' && t.cls === 'ca'));
assert.strictEqual(v.ppCls, 'neu', 'corporate-action rows never use --up/--down');
assert.ok(v.notes.some((n) => /naik 38,5%/.test(n)));
assert.strictEqual(v.extra, 'karena aksi korporasi');

v = D.rowView({ ...base, status: 'INCREASE', transfer: true }, tn);
assert.ok(v.tags.some((t) => t.text === 'Transfer' && t.cls === 'tr'));
assert.strictEqual(v.extra, 'transfer antar pemegang');

v = D.rowView({ ...base, status: 'INCREASE', possible_corporate_action: true, merged_rows_changed: true, type_changed: true, prev_investor_type: 'ID' }, tn);
assert.ok(v.tags.some((t) => t.text === 'Indikatif' && t.cls === 'ind'));
assert.strictEqual(v.hasNote, true, 'warn dot when there are notes');
assert.strictEqual(v.notes.length, 3);

// v1 cache can still serve a 0-share INCREASE row (ALKA): never "Naik", never a pp figure.
v = D.rowView({ ...base, code: 'ALKA', status: 'INCREASE', delta_shares: 0, delta_pct: 0.01, prev_pct: 83.79, curr_pct: 83.8 }, tn);
assert.strictEqual(v.tags[0].text, 'Tidak berubah');
assert.strictEqual(v.ppText, '0 lembar');
assert.ok(!/0,01/.test(v.ppText + v.sharesText), 'no pp printed for a 0-share row');
assert.ok(!/naik/.test(v.aria));

// top 5
const top = D.topView({ code: 'BBCA', issuer: 'BANK CENTRAL ASIA Tbk', net_delta_shares: 38200000, net_delta_pct_points: 0.42, holders_changed: 12 });
assert.strictEqual(top.ppText, '+0,42 pp');
assert.strictEqual(top.holders, '12 pemegang berubah');
assert.strictEqual(top.sharesText, '+38,2 jt lembar');
assert.strictEqual(top.ppCls, 'up');
assert.strictEqual(D.topView({ code: 'X', issuer: 'x', net_delta_shares: -1000000, net_delta_pct_points: -1.5, holders_changed: 1 }).ppCls, 'down');

// ticker order: Masuk, Keluar, Naik/Turun by |delta pct|, Turun <1%, Pindah nama
const ord = D.orderTickerRows([
  { status: 'ENTITY_CHANGE', investor: 'e' }, { status: 'DILUTED', investor: 'd' }, { status: 'DECREASE', delta_pct: -0.5, investor: 'b' },
  { status: 'EXIT', investor: 'x' }, { status: 'INCREASE', delta_pct: 2, investor: 'a' }, { status: 'NEW', investor: 'n' }
]).map((r) => r.investor);
assert.deepStrictEqual(ord, ['n', 'x', 'a', 'b', 'd', 'e']);

// chips -> API params
assert.deepStrictEqual(D.chipQuery('ALL'), {});
assert.deepStrictEqual(D.chipQuery('INCREASE'), { status: 'INCREASE' });
assert.deepStrictEqual(D.chipQuery('ENTITY_CHANGE'), { status: 'ENTITY_CHANGE' });
assert.deepStrictEqual(D.chipQuery('CORP'), {}, 'no backend param for Aksi korporasi yet: filtered client-side');
assert.deepStrictEqual(D.chipQuery('TRANSFER'), {});
assert.strictEqual(D.chipPredicate('CORP')({ status: 'DILUTED' }), true);
assert.strictEqual(D.chipPredicate('CORP')({ status: 'INCREASE', corporate_action: true }), true);
assert.strictEqual(D.chipPredicate('CORP')({ status: 'INCREASE' }), false);
assert.strictEqual(D.chipPredicate('TRANSFER')({ transfer: true }), true);
assert.deepStrictEqual(D.CHIPS.map((c) => c.label), ['Semua', 'Naik', 'Turun', 'Investor Baru', 'Keluar \u22651%', 'Aksi korporasi', 'Transfer', 'Pindah nama']);
assert.strictEqual(D.qs({ a: 1, b: '', c: null, d: 'x y' }), '?a=1&d=x+y');

// ---- 3. gating (cosmetic; server is the real check) ----
store.authRestoring = false;
store.userTier = 'gratis'; store.userProfile = null;
assert.strictEqual(store.canDiff, false);
assert.strictEqual(store.diffTier, 'free');
for (const tier of ['investor', 'pakar', 'pro']) {
  store.userTier = tier; store.userProfile = { tier, features: ['holders_top5', 'history_mom'] };
  assert.strictEqual(store.canDiff, true, `${tier} with history_mom is Pro`);
  assert.strictEqual(store.diffTier, 'pro', `${tier} behaves identically (no investor-only branch)`);
}
store.userTier = 'investor'; store.userProfile = { tier: 'investor', features: ['holders_top5'] };
assert.strictEqual(store.canDiff, false, 'flag missing => no full diff, regardless of tier name');
assert.strictEqual(store.diffTier, 'pro_no_diff');
store.userTier = 'gratis'; store.userProfile = { tier: 'gratis', features: ['history_mom'] };
assert.strictEqual(store.diffTier, 'pro', 'single check = the flag (server decides what the flag means)');
store.userTier = 'gratis'; store.userProfile = null;

// no Free-lock flash while the session restores or /me is in flight
store.authRestoring = true;
assert.strictEqual(store.diffReady, false, 'restoring => not ready');
store.authRestoring = false; store.userTier = 'loading';
assert.strictEqual(store.diffReady, false, '/me in flight => not ready');
store.userTier = 'gratis';
assert.strictEqual(store.diffReady, true);

// getters survived the descriptor merge as live getters
assert.strictEqual(Object.getOwnPropertyDescriptor(store, 'canDiff').get !== undefined, true, 'canDiff is a live getter');

// ---- 4. summary load: anonymous, no token, no table/ticker call ----
const summary = { available: true, from_as_of: '2026-08-31', to_as_of: '2026-09-30', gap_days: 30, is_consecutive: true,
  totals: { increase: 1230, decrease: 1080, new: 160, exit: 143, entity_change: 12, diluted: 23 },
  top_accumulated: [{ code: 'BBCA', issuer: 'BANK CENTRAL ASIA Tbk', net_delta_shares: 38200000, net_delta_pct_points: 0.42, holders_changed: 12 }],
  top_distributed: [{ code: 'ADRO', issuer: 'ALAMTRI', net_delta_shares: -1000000, net_delta_pct_points: -0.3, holders_changed: 3 }],
  excluded_count: 7, locked: true };
handler = async (u) => {
  if (u.includes('/diff/summary')) return { ok: true, status: 200, json: async () => summary };
  if (u.includes('/diff/snapshots')) return { ok: true, status: 200, json: async () => ({ snapshots: [{ as_of: '2026-08-31' }, { as_of: '2026-09-30', prev_as_of: '2026-08-31' }] }) };
  return { ok: false, status: 404, json: async () => ({}) };
};
calls.length = 0;
await store.diffEnsureLoaded();
assert.deepStrictEqual(calls.map((c) => c.url).sort(), ['/api/v1/diff/snapshots', '/api/v1/diff/summary']);
assert.ok(calls.every((c) => !c.headers.Authorization), 'summary/snapshots are anonymous: no ID token sent');
assert.ok(!calls.some((c) => /\/diff\/(table|ticker)/.test(c.url)), 'Free never calls table/ticker');
assert.strictEqual(store.diffPeriodText, '30 Sep 2026 dibanding 31 Agu 2026');
assert.strictEqual(store.diffGapBanner, '');
assert.strictEqual(store.diffLockCounts, '160 investor baru masuk >1%, 143 keluar, 1.230 posisi naik, 1.080 turun.');
assert.strictEqual(store.diffTop[0].code, 'BBCA');
store.diff.seg = 'dist';
assert.strictEqual(store.diffTop[0].code, 'ADRO');
store.diff.seg = 'acc';
assert.ok(/12 pindah nama dan 23 turun <1%/.test(store.diffNotCounted));
assert.strictEqual(store.diffExcluded, '7 saham baru/keluar bursa tidak masuk peringkat.');
assert.ok(/KSEI via IDX/.test(store.diffSourceLine) && /31 Agu 2026/.test(store.diffSourceLine) && /30 Sep 2026/.test(store.diffSourceLine));
assert.strictEqual(store.diffTiles.map((t) => t.n).join(','), '1.230,1.080,160,143');
await store.diffEnsureLoaded();
assert.strictEqual(calls.length, 2, 'summary cached per session (no refetch)');

// non-consecutive: banner + "(N bulan lalu)"
store.diff.summary = { ...summary, from_as_of: '2026-05-29', gap_days: 124, is_consecutive: false };
assert.strictEqual(store.diffPeriodText, '30 Sep 2026 dibanding 29 Mei 2026 (4 bulan lalu)');
assert.ok(/^Selisih 4 bulan\./.test(store.diffGapBanner));
store.diff.summary = summary;

// 2 snapshots => selects hidden; >= 3 => shown
assert.strictEqual(store.diffHasPeriods, false);
store.diff.snapshots = [{ as_of: '2026-07-31' }, { as_of: '2026-08-31', prev_as_of: '2026-07-31' }, { as_of: '2026-09-30', prev_as_of: '2026-08-31' }];
assert.strictEqual(store.diffHasPeriods, true);

// ---- 5. Pro sheet: token, params, errors, abort/ordering ----
store.userTier = 'pakar'; store.userProfile = { tier: 'pakar', features: ['history_mom'] };
auth._resetAuthForTesting();
const tokenMod = await import(url('public/src/auth.js'));
// no token => expired state, no request
calls.length = 0;
store.diffSheet.chip = 'ALL';
await store.diffLoad(true);
assert.strictEqual(store.diffSheet.state, 'expired');
assert.strictEqual(calls.length, 0, 'no token => no table request');

// Provide a token via the module's in-memory slot using the public test hook if present, else patch getToken indirection.
// store.js calls the imported getToken(); we can't swap it, so exercise the request builder through diffGet.
calls.length = 0;
handler = async () => ({ ok: true, status: 200, json: async () => ({ available: true, rows: [], total: 0, next_cursor: null }) });
const r1 = await D.diffGet('/api/v1/diff/table' + D.qs({ status: 'NEW', limit: 100, cursor: 0 }), { token: 'tkn' });
assert.strictEqual(r1.ok, true);
assert.strictEqual(calls[0].url, '/api/v1/diff/table?status=NEW&limit=100&cursor=0');
assert.strictEqual(calls[0].headers.Authorization, 'Bearer tkn');
handler = async () => { throw new TypeError('network'); };
assert.deepStrictEqual(await D.diffGet('/x'), { ok: false, status: 0, data: null });
handler = async () => { const e = new Error('abort'); e.name = 'AbortError'; throw e; };
assert.strictEqual((await D.diffGet('/x')).aborted, true);
handler = async () => ({ ok: false, status: 403, json: async () => ({ detail: { error: 'tier_required' } }) });
assert.strictEqual((await D.diffGet('/x', { token: 't' })).status, 403);

// Auth change drops gated state
store.stkChg = { code: 'BBCA', loading: false, state: '', rows: [1], meta: {} };
store._stkCache = { BBCA: {} };
store.userTier = 'gratis'; store.userProfile = null;
store.diffOnAuthChange();
assert.deepStrictEqual(store._stkCache, {}, 'gated rows are not kept after logout');
assert.strictEqual(store.stkChg.rows.length, 0);
assert.strictEqual(store.stkTab, 'now');

// ---- 6. stock toggle: Free never switches tab, Pro does, pro_no_diff shows note ----
store.userTier = 'gratis'; store.userProfile = null; store.stkTab = 'now';
store.stkSelect('chg');
assert.strictEqual(store.stkTab, 'now', 'Free tap does NOT switch the tab');
assert.strictEqual(store.stkFlash, true, 'Free tap pulses the inline lock');
store.userTier = 'investor'; store.userProfile = { features: [] };
store.stkSelect('chg');
assert.strictEqual(store.stkTab, 'chg', 'paid without flag sees the neutral note');
store.stkReset();
assert.strictEqual(store.stkTab, 'now');

// openPro keys 'diff' and 'diff_ticker' open the Pro sheet for Free (analytics key = why)
store.userTier = 'gratis'; store.proOpen = false;
store.openPro('diff');
assert.strictEqual(store.proOpen, true); assert.strictEqual(store.proWhy, 'diff');
store.proOpen = false; store.openPro('diff_ticker');
assert.strictEqual(store.proWhy, 'diff_ticker'); store.proOpen = false;

// ---- 7. markup / copy guards ----
const html = read('public/index.html');
const css = read('public/assets/css/style.css');
const diffJs = read('public/src/diff.js');
const copyDiff = JSON.stringify(COPY.diff);
assert.ok(/id="diffCard"/.test(html) && /id="diffSheet"/.test(html) && /id="diffPeriodTo"/.test(html) && /id="diffPeriodFrom"/.test(html) && /id="diffSearch"/.test(html), 'new ids present');
assert.ok(!/C\.soon\.delta|card_delta|openPro\('delta'\)/.test(html + read('public/src/copy.js')), 'old delta lock card removed');
for (const id of ['v-analytics', 'sheet', 'pane', 'proSheet', 'scrim', 'akunSheet', 'infoSheet']) assert.ok(new RegExp(`id="${id}"`).test(html), `existing id kept: ${id}`);
assert.ok(!/\b(Beli|Jual|Bandar|Bandarmology|Pakar)\b/.test(copyDiff + diffJs.replace(/history_mom|pakar/g, '')), 'no Beli/Jual/Bandar/Pakar in new strings');
assert.ok(/bukan pasti beli atau jual/.test(COPY.diff.caveat), 'only the negated form of beli/jual appears');
const diffHtml = html.slice(html.indexOf('id="diffCard"'), html.indexOf('<!-- Card 1'))
  + html.slice(html.indexOf('id="diffSheet"'), html.indexOf('<!-- Akun Sheet -->'));
assert.ok(!/style="/.test(diffHtml), 'no inline style="" in new markup');
const diffCss = css.slice(css.indexOf('/* ===== F1 diff'));
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(diffCss), 'no hex colours in diff CSS');
assert.ok(/OJK/.test(COPY.diff.source) && /KSEI via IDX/.test(COPY.diff.source), 'N-4: source + OJK not-advice line');
assert.ok(/indikatif/i.test(COPY.diff.indicative), 'N-4: corporate-action heuristic flagged as indicative');
assert.ok(/class="df-src"/.test(html), 'source/as-of box in card and sheets');
assert.strictEqual((html.slice(html.indexOf('id="diffCard"'), html.indexOf('<!-- Card 1')).match(/class="btn pri/g) || []).length <= 2, true);
// Blurred bars are placeholders only: the teaser markup carries no bound data
const teaser = html.slice(html.indexOf('class="df-teaser"'), html.indexOf('class="df-lockcard"'));
assert.ok(!/x-text/.test(teaser), 'teaser has no data bindings (never blur real data)');
// Pro sheet row now ships
const row = COPY.pro_sheet.rows.find((r) => /antar-bulan/.test(r.feature));
assert.deepStrictEqual([row.free, row.pro, row.soon], ['Ringkasan 5 teratas', 'Lengkap', false]);
// Worker must not cache or rewrite cache-control for diff endpoints
const worker = read('worker.js');
assert.ok(!/cacheEverything/.test(worker), 'N-3: worker never sets cacheEverything');
// Gated rows never persisted
assert.ok(!/localStorage|sessionStorage/.test(diffJs), 'gated rows never persisted');

console.log('OK test_f1_diff.js');
