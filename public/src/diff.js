// F1: Perubahan Kepemilikan Bulanan (month-over-month ownership diff).
// Pure helpers (formatting, row view models) + API calls + a store mixin.
// Spec: design/f1-diff-spec-ui.md (Pam, rev 2). The UI only renders what the API says:
// corporate-action / transfer / entity-change rules live in the backend, never here.
// The server is the real gate (history_mom); the UI gate below is cosmetic.
import { COPY } from './copy.js';
import { toTitleCase } from './utils.js';
import { getToken } from './auth.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MINUS = '\u2212';
const PAGE = 100;
const BIG_PAGE = 500;
const MAX_CLIENT_PAGES = 20;
const CLIENT_CHIPS = ['CORP', 'TRANSFER']; // no backend param yet: filtered client-side over all pages
export const DIFF_FEATURE = 'history_mom';

// ---------- formatting (single source, spec section 5 + 15.6) ----------

const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const NF = { 0: nf(0), 1: nf(1), 2: nf(2) };
const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v));

export function fmtInt(n) { return NF[0].format(Math.round(num(n))); }

function sgn(n, body) {
    if (n > 0) return '+' + body;
    if (n < 0) return MINUS + body;
    return body;
}

// Percentage points: 2 decimals, comma, always signed, " pp". |v| < 0.005 prints 0,00 pp (no sign).
export function fmtPP(v) {
    const n = num(v);
    const r = Math.round(Math.abs(n) * 100) / 100;
    if (r === 0) return '0,00 pp';
    return sgn(n < 0 ? -1 : 1, NF[2].format(r)) + ' pp';
}

export function fmtPct2(v) { return NF[2].format(num(v)) + '%'; }

// Compact shares. >=1e9 "x,xx mlr", >=1e6 "x,x jt", >=1e3 "x,x rb", else integer.
// If rounding would print 1.000,0 of the lower unit, promote to the next unit.
function compAbs(a) {
    if (a >= 1e9) return NF[2].format(a / 1e9) + ' mlr';
    if (a >= 1e6) {
        if (Math.round((a / 1e6) * 10) / 10 >= 1000) return NF[2].format(a / 1e9) + ' mlr';
        return NF[1].format(a / 1e6) + ' jt';
    }
    if (a >= 1e3) {
        if (Math.round((a / 1e3) * 10) / 10 >= 1000) return NF[1].format(a / 1e6) + ' jt';
        return NF[1].format(a / 1e3) + ' rb';
    }
    return NF[0].format(Math.round(a));
}

export function comp(n, signed = false) {
    const v = num(n);
    const body = compAbs(Math.abs(v));
    return signed ? sgn(v, body) : body;
}

export function fmtDateId(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function monthLabel(iso) {
    const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
    if (!m) return '';
    return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

export function gapMonths(days) { return Math.max(1, Math.round(num(days) / 30)); }

export function fill(tpl, vars = {}) {
    return String(tpl).replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

// ---------- row view models ----------

const CHANGED = ['INCREASE', 'DECREASE', 'NEW', 'EXIT'];

export function isChanged(r) { return CHANGED.includes(r && r.status); }

export const CHIPS = [
    { f: 'ALL', label: COPY.diff.chip_all },
    { f: 'INCREASE', label: COPY.diff.chip_up },
    { f: 'DECREASE', label: COPY.diff.chip_down },
    { f: 'NEW', label: COPY.diff.chip_new },
    { f: 'EXIT', label: COPY.diff.chip_exit },
    { f: 'CORP', label: COPY.diff.chip_corp },
    { f: 'TRANSFER', label: COPY.diff.chip_transfer },
    { f: 'ENTITY_CHANGE', label: COPY.diff.chip_entity }
];

// API request for a chip. CORP / TRANSFER have no backend filter yet (Pam 15.10 item 1).
export function chipQuery(f) {
    if (f === 'ALL' || CLIENT_CHIPS.includes(f)) return {};
    return { status: f };
}

export function chipPredicate(f) {
    if (f === 'CORP') return (r) => r.corporate_action === true || r.status === 'DILUTED';
    if (f === 'TRANSFER') return (r) => r.transfer === true;
    return () => true;
}

export function isClientChip(f) { return CLIENT_CHIPS.includes(f); }

const STATUS_TAG = {
    INCREASE: 'status_inc',
    DECREASE: 'status_dec',
    NEW: 'status_new',
    EXIT: 'status_exit',
    ENTITY_CHANGE: 'status_entity',
    DILUTED: 'status_diluted'
};

function statusWord(r, unchanged) {
    if (unchanged) return COPY.diff.status_same;
    return COPY.diff[STATUS_TAG[r.status]] || r.status || '';
}

export function rowView(r, typeName = (t) => t) {
    const D = COPY.diff;
    const dShares = num(r.delta_shares);
    const dPct = num(r.delta_pct);
    const isEntity = r.status === 'ENTITY_CHANGE';
    const isDiluted = r.status === 'DILUTED';
    // v1 cache can still deliver a 0-share row for INCREASE/DECREASE: never show it as a move.
    const unchanged = !isEntity && !isDiluted && !(r.status === 'NEW' || r.status === 'EXIT') && dShares === 0;
    const corp = r.corporate_action === true;

    const tags = [{ text: statusWord(r, unchanged), cls: '' }];
    if (corp && !isDiluted && !unchanged) tags.push({ text: D.tag_corp, cls: 'ca' });
    if (r.transfer === true) tags.push({ text: D.tag_transfer, cls: 'tr' });
    if (r.possible_corporate_action === true) tags.push({ text: D.tag_indicative, cls: 'ind' });

    const prevPct = r.prev_pct == null ? null : num(r.prev_pct);
    const currPct = r.curr_pct == null ? null : num(r.curr_pct);
    let pctLine;
    if (r.status === 'NEW') pctLine = `${D.pct_new} \u2192 ${fmtPct2(currPct)}`;
    else if (r.status === 'EXIT' || isDiluted) pctLine = `${fmtPct2(prevPct)} \u2192 <1%`;
    else pctLine = `${fmtPct2(prevPct)} \u2192 ${fmtPct2(currPct)}`;

    let ppText; let ppCls; let sharesText; let extra = '';
    if (isEntity) {
        ppText = D.val_not_counted; ppCls = 'zero'; sharesText = D.val_entity_shares;
        extra = fill(D.extra_prev_name, { name: toTitleCase(r.prev_investor || '') });
        pctLine = `${fmtPct2(currPct)}`;
    } else if (isDiluted) {
        ppText = D.val_diluted; ppCls = 'zero';
        sharesText = `${comp(dShares, true)} ${D.shares_unit}`;
        extra = D.extra_diluted;
    } else if (unchanged) {
        ppText = D.val_zero_shares; ppCls = 'zero'; sharesText = '';
        pctLine = `${fmtPct2(prevPct)} \u2192 ${fmtPct2(currPct)}`;
    } else {
        ppText = fmtPP(dPct);
        const up = r.status === 'INCREASE' || r.status === 'NEW';
        ppCls = corp ? 'neu' : (dPct === 0 ? 'zero' : (up ? 'up' : 'down'));
        sharesText = `${comp(dShares, true)} ${D.shares_unit}`;
        if (corp) extra = D.extra_corp;
        else if (r.transfer === true) extra = D.extra_transfer;
    }

    const notes = [];
    if (isEntity) notes.push(fill(D.note_entity, { name: toTitleCase(r.prev_investor || '') }));
    if (isDiluted) notes.push(D.note_diluted);
    if (r.status === 'EXIT') notes.push(D.note_exit);
    if (corp && !isDiluted) {
        const c = num(r.issuer_shares_change_pct);
        notes.push(fill(D.note_corp_event, { code: r.code, dir: c < 0 ? D.dir_down : D.dir_up, pct: NF[1].format(Math.abs(c)) }));
    }
    if (r.transfer === true) notes.push(D.note_transfer);
    if (r.possible_corporate_action === true) notes.push(D.note_corp);
    if (r.merged_rows_changed === true) notes.push(D.note_merge);
    if (r.type_changed === true) notes.push(fill(D.note_type, { prev: typeName(r.prev_investor_type || '') }));
    const hasNote = r.possible_corporate_action === true || r.merged_rows_changed === true || r.type_changed === true;

    const investor = toTitleCase(r.investor || '');
    const ariaPP = (isEntity || isDiluted || unchanged) ? '' : `, ${dPct < 0 ? D.aria_down : D.aria_up} ${NF[2].format(Math.abs(dPct))} ${D.aria_pp}`;

    let exactCurr = fmtInt(r.curr_shares);
    let exactDelta = sgn(dShares, fmtInt(Math.abs(dShares)));
    if (r.status === 'EXIT') {
        exactCurr = D.exact_exit_curr;
        exactDelta = D.exact_exit_delta;
    } else if (isEntity) {
        exactDelta = D.exact_entity_delta;
    }

    return {
        key: `${r.code}|${r.investor}|${r.status}`,
        code: r.code,
        issuer: toTitleCase(r.issuer || ''),
        investor,
        tags,
        pctLine,
        meta: [typeName(r.investor_type), r.local_foreign === 'L' ? COPY.origin_types.L : (r.local_foreign === 'F' || r.local_foreign === 'A' ? COPY.origin_types.F : '')].filter(Boolean).join(' \u00b7 '),
        extra,
        ppText,
        ppCls,
        sharesText,
        hasNote,
        notes,
        exact: {
            prev: fmtInt(r.prev_shares), curr: exactCurr, delta: exactDelta,
            prevDate: fmtDateId(r.prev_date), currDate: fmtDateId(r.curr_date)
        },
        aria: `${r.code}, ${investor}, ${statusWord(r, unchanged)}${ariaPP}`
    };
}

export function topView(e) {
    const D = COPY.diff;
    const pp = num(e.net_delta_pct_points);
    return {
        code: e.code,
        issuer: toTitleCase(e.issuer || ''),
        holders: fill(D.holders_changed, { n: fmtInt(e.holders_changed) }),
        ppText: fmtPP(pp),
        ppCls: pp === 0 ? 'zero' : (pp > 0 ? 'up' : 'down'),
        sharesText: `${comp(e.net_delta_shares, true)} ${D.shares_unit}`,
        aria: `${e.code}, ${pp < 0 ? D.aria_down : D.aria_up} ${NF[2].format(Math.abs(pp))} ${D.aria_pp}`
    };
}

// Stock sheet "Riwayat Perubahan" order: Masuk, Keluar, Naik/Turun by |delta pct|, Turun <1%, Pindah nama.
export function orderTickerRows(rows) {
    const rank = (r) => {
        if (r.status === 'NEW') return 0;
        if (r.status === 'EXIT') return 1;
        if (r.status === 'DILUTED') return 3;
        if (r.status === 'ENTITY_CHANGE') return 4;
        return 2;
    };
    return [...rows].sort((a, b) => rank(a) - rank(b)
        || Math.abs(num(b.delta_pct)) - Math.abs(num(a.delta_pct))
        || String(a.investor).localeCompare(String(b.investor)));
}

// ---------- API ----------

export async function diffGet(path, { token = null, signal } = {}) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
        const res = await fetch(path, { headers, signal });
        let data = null;
        try { data = await res.json(); } catch (_) { data = null; }
        return { ok: res.ok, status: res.status, data };
    } catch (e) {
        if (e && e.name === 'AbortError') return { ok: false, status: -1, data: null, aborted: true };
        return { ok: false, status: 0, data: null };
    }
}

export function qs(params) {
    const p = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') p.set(k, String(v)); });
    const s = p.toString();
    return s ? `?${s}` : '';
}

// Edge fade: show a side only while there is more to scroll to that side.
export function fadeEdges(wrap) {
    if (!wrap || wrap._fadeBound) return;
    const sc = wrap.querySelector('.fade-scroll');
    if (!sc) return;
    const upd = () => {
        const m = sc.scrollWidth - sc.clientWidth;
        wrap.classList.toggle('can-l', sc.scrollLeft > 2);
        wrap.classList.toggle('can-r', sc.scrollLeft < m - 2);
    };
    sc.addEventListener('scroll', upd, { passive: true });
    window.addEventListener('resize', upd);
    wrap._fadeBound = true;
    wrap._fadeUpdate = upd;
    upd();
}

// ---------- store mixin ----------

function freshSheet() {
    return {
        to: null, from: null, chip: 'ALL', q: '', type: '', lf: '', sort: 'abs',
        rows: [], cursor: null, total: null, loading: false, more: false, error: null, state: '',
        expanded: null, types: [], clientAll: null, shown: 0, meta: null
    };
}

export const diffMixin = {
    D: COPY.diff,
    diffChips: CHIPS,

    diff: { loading: false, loaded: false, error: false, summary: null, snapshots: [], seg: 'acc' },
    diffOpen: false,
    diffSheet: freshSheet(),
    stkTab: 'now',
    stkFlash: false,
    stkChg: { code: null, loading: false, state: '', rows: [], meta: null },
    _diffSeq: 0,
    _diffAbort: null,
    _diffTimer: null,
    _diffOpener: null,
    _authEpoch: 0,
    _stkAbort: null,
    _stkCache: {},

    // ----- gating (cosmetic; server enforces history_mom) -----
    get userFeatures() { return (this.userProfile && Array.isArray(this.userProfile.features)) ? this.userProfile.features : []; },
    get canDiff() { return this.userFeatures.includes(DIFF_FEATURE); },
    // 'free' | 'pro' | 'pro_no_diff' (paid but flag missing: neutral note, never an error)
    get diffTier() {
        if (this.canDiff) return 'pro';
        return this.isPro ? 'pro_no_diff' : 'free';
    },
    // false while the session restores or /me is in flight: no Free-lock flash before Pro content
    get diffReady() { return !this.authRestoring && !this.tierLoading; },

    dfT(key, vars) { return fill(COPY.diff[key] || key, vars); },
    fmtInt,

    // ----- card -----
    async diffEnsureLoaded() {
        if (this.diff.loaded || this.diff.loading) return;
        this.diff.loading = true;
        this.diff.error = false;
        const [snaps, sum] = await Promise.all([
            diffGet('/api/v1/diff/snapshots'),
            diffGet('/api/v1/diff/summary')
        ]);
        this.diff.loading = false;
        if (!sum.ok || !sum.data) { this.diff.error = true; return; }
        this.diff.summary = sum.data;
        this.diff.snapshots = (snaps.ok && snaps.data && Array.isArray(snaps.data.snapshots)) ? snaps.data.snapshots : [];
        this.diff.loaded = true;
    },
    diffReload() { this.diff.loaded = false; this.diff.error = false; return this.diffEnsureLoaded(); },

    get diffAvail() { return !!(this.diff.summary && this.diff.summary.available !== false); },
    get diffPeriodText() {
        const s = this.diff.summary;
        if (!s || s.available === false) return '';
        const vars = { to: fmtDateId(s.to_as_of), from: fmtDateId(s.from_as_of), n: gapMonths(s.gap_days) };
        return fill(s.is_consecutive === false ? COPY.diff.period_gap : COPY.diff.period, vars);
    },
    get diffGapBanner() {
        const s = this.diff.summary;
        return s && s.available !== false && s.is_consecutive === false ? fill(COPY.diff.gap_banner, { n: gapMonths(s.gap_days) }) : '';
    },
    get diffTop() {
        const s = this.diff.summary;
        if (!s || s.available === false) return [];
        const list = this.diff.seg === 'acc' ? s.top_accumulated : s.top_distributed;
        return (list || []).map(topView);
    },
    get diffTotals() { return (this.diff.summary && this.diff.summary.totals) || {}; },
    get diffLockCounts() {
        const t = this.diffTotals;
        if (t.new == null) return '';
        return fill(COPY.diff.lock_counts, { new: fmtInt(t.new), exit: fmtInt(t.exit), inc: fmtInt(t.increase), dec: fmtInt(t.decrease) });
    },
    get diffNotCounted() {
        const t = this.diffTotals;
        if (!(num(t.entity_change) > 0 || num(t.diluted) > 0)) return '';
        return fill(COPY.diff.not_counted, { entity: fmtInt(t.entity_change), diluted: fmtInt(t.diluted) });
    },
    get diffExcluded() {
        const n = num(this.diff.summary && this.diff.summary.excluded_count);
        return n > 0 ? fill(COPY.diff.excluded, { n: fmtInt(n) }) : '';
    },
    get diffSourceLine() {
        const s = this.diff.summary;
        if (!s || s.available === false) return '';
        return fill(COPY.diff.source, { from: fmtDateId(s.from_as_of), to: fmtDateId(s.to_as_of) });
    },
    get diffTiles() {
        const t = this.diffTotals;
        return [
            { f: 'INCREASE', n: fmtInt(t.increase), label: COPY.diff.tile_up, aria: fill(COPY.diff.tile_aria_up, { n: fmtInt(t.increase) }) },
            { f: 'DECREASE', n: fmtInt(t.decrease), label: COPY.diff.tile_down, aria: fill(COPY.diff.tile_aria_down, { n: fmtInt(t.decrease) }) },
            { f: 'NEW', n: fmtInt(t.new), label: COPY.diff.tile_new, aria: fill(COPY.diff.tile_aria_new, { n: fmtInt(t.new) }) },
            { f: 'EXIT', n: fmtInt(t.exit), label: COPY.diff.tile_exit, aria: fill(COPY.diff.tile_aria_exit, { n: fmtInt(t.exit) }) }
        ];
    },

    // ----- Semua Perubahan sheet (Pro) -----
    get diffHasPeriods() { return this.diff.snapshots.length >= 3; },
    get diffToOptions() { return this.diff.snapshots.map((s) => ({ v: s.as_of, t: monthLabel(s.as_of) })).reverse(); },
    get diffFromOptions() {
        const to = this.diffSheet.to;
        const list = this.diff.snapshots.filter((s) => !to || s.as_of < to).map((s) => s.as_of).reverse();
        return list.map((v) => {
            const t = this.diff.snapshots.find((s) => s.as_of === to);
            const gap = (t && t.prev_as_of && t.prev_as_of !== v)
                ? ` (${Math.round((Date.parse(to) - Date.parse(v)) / 86400000 / 30)} bln lalu)` : '';
            return { v, t: monthLabel(v) + gap };
        });
    },
    get diffSheetPeriod() {
        const m = this.diffSheet.meta;
        if (!m) return '';
        return fill(m.is_consecutive === false ? COPY.diff.period_gap : COPY.diff.period, { to: fmtDateId(m.to_as_of), from: fmtDateId(m.from_as_of), n: gapMonths(m.gap_days) });
    },
    get diffSheetGap() {
        const m = this.diffSheet.meta;
        return m && m.is_consecutive === false ? fill(COPY.diff.gap_banner, { n: gapMonths(m.gap_days) }) : '';
    },
    get diffSheetSource() {
        const m = this.diffSheet.meta;
        return m ? fill(COPY.diff.source, { from: fmtDateId(m.from_as_of), to: fmtDateId(m.to_as_of) }) : '';
    },
    get diffTypeOptions() { return this.diffSheet.types.map((t) => ({ v: t, t: this.getTypeName(t) })); },
    get diffMoreVisible() {
        const s = this.diffSheet;
        return !s.loading && !s.state && (s.clientAll ? s.shown < s.clientAll.length : s.cursor != null);
    },

    diffOpenSheet(chip = 'ALL', focusPeriod = false) {
        if (!this.canDiff) return;
        this._diffOpener = document.activeElement || null;
        const s = this.diff.summary;
        this.diffSheet = freshSheet();
        this.diffSheet.chip = chip;
        this.diffSheet.to = s && s.to_as_of ? s.to_as_of : null;
        this.diffSheet.from = s && s.from_as_of ? s.from_as_of : null;
        this.diffOpen = true;
        this.diffLoad(true);
        this.$nextTick && this.$nextTick(() => {
            const sheet = document.getElementById('diffSheet');
            const db = sheet && sheet.querySelector('.db');
            if (db) db.scrollTop = 0;
            const target = focusPeriod && document.getElementById('diffPeriodTo') || db;
            if (target && target.focus) target.focus();
            if (sheet) sheet.querySelectorAll('.fade-wrap').forEach((w) => { fadeEdges(w); if (w._fadeUpdate) w._fadeUpdate(); });
        });
    },

    diffCloseSheet() {
        if (!this.diffOpen) return;
        this.diffOpen = false;
        if (this._diffAbort) this._diffAbort.abort();
        this._diffSeq++;
        clearTimeout(this._diffTimer);
        const el = this._diffOpener;
        this._diffOpener = null;
        if (el && el.focus && document.contains && document.contains(el)) el.focus();
    },

    diffSetChip(f) {
        if (this.diffSheet.chip === f) return;
        this.diffSheet.chip = f;
        this.diffLoad(true);
    },
    diffSetTo(v) {
        this.diffSheet.to = v;
        const snap = this.diff.snapshots.find((s) => s.as_of === v);
        this.diffSheet.from = snap && snap.prev_as_of ? snap.prev_as_of : null;
        this.diffLoad(true);
    },
    diffSetFrom(v) { this.diffSheet.from = v; this.diffLoad(true); },
    diffSetType(v) { this.diffSheet.type = v; this.diffLoad(true); },
    diffSetLf(v) { this.diffSheet.lf = v; this.diffLoad(true); },
    diffOnSearch() {
        clearTimeout(this._diffTimer);
        this._diffTimer = setTimeout(() => this.diffLoad(true), 300);
    },
    diffReset() {
        const s = this.diffSheet;
        s.chip = 'ALL'; s.q = ''; s.type = ''; s.lf = '';
        this.diffLoad(true);
    },
    diffToggleRow(key) { this.diffSheet.expanded = this.diffSheet.expanded === key ? null : key; },
    diffMore() {
        const s = this.diffSheet;
        if (s.clientAll) {
            s.shown = Math.min(s.clientAll.length, s.shown + PAGE);
            s.rows = s.clientAll.slice(0, s.shown).map((r) => rowView(r, (t) => this.getTypeName(t)));
            return;
        }
        this.diffLoad(false);
    },

    async diffLoad(reset) {
        const s = this.diffSheet;
        if (!this.canDiff) return;
        const token = getToken();
        if (!token) { s.state = 'expired'; s.rows = []; s.total = null; return; }
        if (reset) {
            s.rows = []; s.cursor = null; s.total = null; s.clientAll = null; s.shown = 0; s.expanded = null;
            const db = document.querySelector && document.querySelector('#diffSheet .db');
            if (db) db.scrollTop = 0;
        }
        s.state = '';
        if (this._diffAbort) this._diffAbort.abort();
        const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        this._diffAbort = ctl;
        const seq = ++this._diffSeq;
        s.loading = reset || s.rows.length === 0;
        s.more = !reset;

        const client = isClientChip(s.chip);
        const base = {
            to: s.to, from: s.from, type: s.type, lf: s.lf, q: s.q.trim(), sort: s.sort,
            ...chipQuery(s.chip)
        };
        let all = [];
        let cursor = reset ? 0 : (s.cursor || 0);
        let pages = 0;
        let res;
        do {
            res = await diffGet(`/api/v1/diff/table${qs({ ...base, limit: client ? BIG_PAGE : PAGE, cursor })}`, { token, signal: ctl && ctl.signal });
            if (seq !== this._diffSeq || res.aborted) return; // superseded by a newer request
            if (!res.ok || !res.data || res.data.available === false) break;
            all = all.concat(res.data.rows || []);
            cursor = res.data.next_cursor;
            pages++;
        } while (client && cursor != null && pages < MAX_CLIENT_PAGES);

        s.loading = false; s.more = false;
        if (!res.ok) {
            s.state = res.status === 401 ? 'expired' : res.status === 403 ? 'noactive' : res.status === 422 ? 'toofar' : 'error';
            if (s.state === 'toofar') { const sn = this.diff.snapshots.find((x) => x.as_of === s.to); s.from = sn && sn.prev_as_of ? sn.prev_as_of : s.from; }
            return;
        }
        if (!res.data || res.data.available === false) { s.state = 'na'; return; }

        s.meta = { from_as_of: res.data.from_as_of, to_as_of: res.data.to_as_of, gap_days: res.data.gap_days, is_consecutive: res.data.is_consecutive };
        const tn = (t) => this.getTypeName(t);
        if (client) {
            const pred = chipPredicate(s.chip);
            s.clientAll = all.filter(pred);
            s.shown = Math.min(PAGE, s.clientAll.length);
            s.rows = s.clientAll.slice(0, s.shown).map((r) => rowView(r, tn));
            s.total = s.clientAll.length;
            s.cursor = null;
        } else {
            s.rows = s.rows.concat(all.map((r) => rowView(r, tn)));
            s.cursor = cursor == null ? null : cursor;
            s.total = res.data.total;
        }
        const seen = new Set(s.types);
        all.forEach((r) => { if (r.investor_type) seen.add(r.investor_type); });
        if (seen.size !== s.types.length) s.types = [...seen].sort();
        if (s.rows.length === 0) s.state = 'empty';
    },

    // ----- stock sheet / pane: Pemegang Saat Ini | Riwayat Perubahan -----
    stkReset() { this.stkTab = 'now'; this.stkFlash = false; },
    stkSelect(tab) {
        if (tab === 'now') { this.stkTab = 'now'; return; }
        if (this.canDiff) { this.stkTab = 'chg'; this.stkLoad(); return; }
        if (this.isPro) { this.stkTab = 'chg'; return; } // pro_no_diff: neutral note
        // Free: never switch, pulse the inline lock block (no empty state ever appears)
        this.stkFlash = true;
        setTimeout(() => { this.stkFlash = false; }, 900);
        this.stkScrollLockIntoView();
    },
    stkScrollLockIntoView() {
        if (typeof document === 'undefined') return;
        const sheet = document.getElementById('sheet');
        const pane = document.getElementById('pane');
        let el = null;
        if (sheet && sheet.classList.contains('on')) {
            el = sheet.querySelector('.df-lockinline');
        } else if (pane && pane.offsetParent !== null) {
            el = pane.querySelector('.df-lockinline');
        } else {
            const all = document.querySelectorAll('.df-lockinline');
            for (let i = 0; i < all.length; i++) {
                if (all[i].offsetParent !== null) { el = all[i]; break; }
            }
            if (!el && all.length) el = all[0];
        }
        if (!el || typeof el.scrollIntoView !== 'function') return;
        const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
        el.scrollIntoView({
            behavior: prefersReduced ? 'auto' : 'smooth',
            block: isMobile ? 'center' : 'nearest',
            inline: 'nearest'
        });
    },
    async stkLoad() {
        const code = this.cur && this.cur.kind === 'stock' ? this.cur.arg : null;
        if (!code || !this.canDiff) return;
        if (this._stkCache[code]) { this.stkChg = { code, loading: false, state: this._stkCache[code].state, rows: this._stkCache[code].rows, meta: this._stkCache[code].meta }; return; }
        if (this._stkAbort) { try { this._stkAbort.abort(); } catch (_) {} }
        const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
        this._stkAbort = ctrl;
        const epoch = this._authEpoch || 0;
        this.stkChg = { code, loading: true, state: '', rows: [], meta: null };
        const token = getToken();
        const out = (state, rows = [], meta = null) => {
            if ((this._authEpoch || 0) !== epoch || !this.canDiff) return;
            if (!this.cur || this.cur.arg !== code) return;
            this.stkChg = { code, loading: false, state, rows, meta };
            if (state === '' || state === 'empty') this._stkCache[code] = { state, rows, meta };
        };
        if (!token) return out('expired');
        const res = await diffGet(`/api/v1/diff/ticker/${encodeURIComponent(code)}`, { token, signal: ctrl ? ctrl.signal : undefined });
        if ((this._authEpoch || 0) !== epoch || !this.canDiff) return;
        if (!res.ok) return out(res.status === 401 ? 'expired' : res.status === 403 ? 'noactive' : 'error');
        if (!res.data || res.data.available === false) return out('na');
        const tn = (t) => this.getTypeName(t);
        const rows = orderTickerRows(res.data.rows || []);
        const meta = {
            from_as_of: res.data.from_as_of, to_as_of: res.data.to_as_of, gap_days: res.data.gap_days, is_consecutive: res.data.is_consecutive,
            changed: rows.filter(isChanged).length, entity: rows.filter((r) => r.status === 'ENTITY_CHANGE').length
        };
        out(rows.length ? '' : 'empty', rows.map((r) => rowView(r, tn)), meta);
    },
    get stkChgHeader() {
        const m = this.stkChg.meta;
        if (!m) return '';
        let t = fill(COPY.diff.stk_header, { to: fmtDateId(m.to_as_of), from: fmtDateId(m.from_as_of), n: fmtInt(m.changed) });
        if (m.entity > 0) t += fill(COPY.diff.stk_entity, { k: fmtInt(m.entity) });
        return t;
    },
    get stkChgGap() {
        const m = this.stkChg.meta;
        return m && m.is_consecutive === false ? fill(COPY.diff.gap_banner, { n: gapMonths(m.gap_days) }) : '';
    },
    get stkChgSource() {
        const m = this.stkChg.meta;
        return m ? fill(COPY.diff.source, { from: fmtDateId(m.from_as_of), to: fmtDateId(m.to_as_of) }) : '';
    },
    diffOpenStock(code) {
        // From the sheet / Top 5: open the stock sheet on Riwayat Perubahan (Pro only reaches here).
        this.diffCloseSheet();
        this.openStock(code);
        if (this.cur && this.cur.arg === code) this.stkSelect('chg');
    },

    // Session tier changed (login / logout / /me resolved): drop gated data, reset tabs.
    diffOnAuthChange() {
        this._authEpoch = (this._authEpoch || 0) + 1;
        if (this._stkAbort) {
            try { this._stkAbort.abort(); } catch (_) {}
            this._stkAbort = null;
        }
        this._stkCache = {};
        this.stkChg = { code: null, loading: false, state: '', rows: [], meta: null };
        this.stkTab = 'now';
        if (this.diffOpen && !this.canDiff) this.diffCloseSheet();
        if (!this.canDiff) this.diffSheet = freshSheet();
    },

    diffTrapKey(e) {
        if (e.key !== 'Tab' || !this.diffOpen) return false;
        const sheet = document.getElementById('diffSheet');
        if (!sheet) return false;
        const f = [...sheet.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')]
            .filter((el) => !el.disabled && el.offsetParent !== null);
        if (!f.length) return false;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.querySelector('.db'))) { last.focus(); return true; }
        if (!e.shiftKey && document.activeElement === last) { first.focus(); return true; }
        return false;
    },

    fadeInit(el) { fadeEdges(el); }
};
