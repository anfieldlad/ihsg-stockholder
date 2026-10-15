// public/src/watchlist-core.js - Watchlist "Pantauan" pure logic (no DOM, no network).
// Spec: company/ihsg/watchlist/design.md rev 1. The API (architecture 4.2) already computes
// every number; the FE only formats, sorts and counts. Never recompute net_delta_pct here.
import { COPY } from './copy.js';
import { fill, fmtDateId, gapMonths } from './diff.js';

export const WL_FEATURE = 'watchlist';
export const WL_MAX = 30;
export const WL_WARN_AT = 27;
export const WL_UNDO_MS = 4000;
export const ALERTS_FLAG_KEY = 'ihsg_wl_alerts';

const MINUS = '\u2212';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const NF2 = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v) => (v == null || v === '' || isNaN(Number(v)) ? 0 : Number(v));

// Rank order (design 4.2): changed first, then flagged, then unchanged, then no data.
const RANK = { changed: 0, ca: 1, listed: 1, delisted: 1, unchanged: 2, nodata: 3 };

// P2 (email reminders) stays hidden until live. Opt in for staging with
// localStorage ihsg_wl_alerts=1 or ?wl_alerts=1. Default OFF.
export function alertsUiEnabled() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(ALERTS_FLAG_KEY) === '1') return true;
  } catch (_) { /* storage blocked */ }
  try {
    if (typeof location !== 'undefined' && new URLSearchParams(location.search || '').get('wl_alerts') === '1') return true;
  } catch (_) { /* no location */ }
  return false;
}

// "+5,36 poin" / "\u221215,86 poin". Real minus sign. |v| < 0.005 has no sign.
export function fmtPoin(v) {
  const n = num(v);
  const r = Math.round(Math.abs(n) * 100) / 100;
  if (r === 0) return `${NF2.format(0)} ${COPY.watchlist.unit}`;
  return `${n < 0 ? MINUS : '+'}${NF2.format(r)} ${COPY.watchlist.unit}`;
}

function flagsOf(item) {
  const f = item && item.change && Array.isArray(item.change.flags) ? item.change.flags : [];
  return f;
}

// kind: changed | unchanged | ca | listed | delisted | nodata
export function itemKind(item) {
  const ch = item && item.change;
  if (!ch) return 'nodata';
  const flags = flagsOf(item);
  if (flags.includes('corporate_action') || flags.includes('transfer')) return 'ca';
  if (flags.includes('listed')) return 'listed';
  if (flags.includes('delisted')) return 'delisted';
  if (ch.status === 'no_data') return 'nodata';
  if (ch.status === 'unchanged' || !num(ch.n_changes)) return 'unchanged';
  return 'changed';
}

// View model for one row. Corporate-action rows never get a coloured delta (data trap).
export function rowView(item) {
  const W = COPY.watchlist;
  const ch = item.change || {};
  const kind = itemKind(item);
  const n = num(ch.n_changes);
  const v = { code: item.code, name: item.name || item.code, kind, cls: 'fl', main: '', sub: '', chip: '', aria: '' };
  if (kind === 'changed') {
    const d = num(ch.net_delta_pct);
    if (Math.round(Math.abs(d) * 100) === 0) {
      v.main = W.unchanged;
    } else {
      v.cls = d > 0 ? 'up' : 'dn';
      v.main = fmtPoin(d);
      v.sub = d > 0 ? W.up : W.down;
    }
    v.chip = fill(W.holders_changed, { n });
  } else if (kind === 'ca') {
    v.main = W.ca; v.sub = W.ca_sub;
    if (n > 0) v.chip = fill(W.holders_changed, { n });
  } else if (kind === 'listed') {
    v.main = W.listed;
  } else if (kind === 'delisted') {
    v.main = W.delisted;
  } else if (kind === 'unchanged') {
    v.main = W.unchanged;
  } else {
    v.main = W.no_data;
  }
  v.aria = `${v.code}, ${v.main}${v.sub && kind === 'changed' ? '' : ''}`.trim();
  if (kind === 'changed' && v.sub) v.aria = `${v.code}, ${v.sub} ${v.main.replace(/^[+\u2212]/, '')}`;
  return v;
}

function absDelta(item) {
  return Math.abs(num(item.change && item.change.net_delta_pct));
}

// Fixed order, no control. Ties: added_at desc. Does not mutate the input.
export function sortItems(items) {
  return [...items].sort((a, b) => {
    const ka = itemKind(a); const kb = itemKind(b);
    if (RANK[ka] !== RANK[kb]) return RANK[ka] - RANK[kb];
    if (ka === 'changed' && absDelta(a) !== absDelta(b)) return absDelta(b) - absDelta(a);
    return String(b.added_at || '').localeCompare(String(a.added_at || ''));
  });
}

// Summary strip. changed + same + ca always equals items.length (A4).
export function summarize(items) {
  let changed = 0; let ca = 0;
  items.forEach((it) => {
    const k = itemKind(it);
    if (k === 'changed') changed += 1;
    else if (k === 'ca') ca += 1;
  });
  return { changed, ca, same: items.length - changed - ca, total: items.length };
}

function shortDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}` : '';
}

// "31 Agu" ... "30 Sep 2026" (year on the end date; on both when years differ).
export function periodParts(pair) {
  if (!pair || !pair.from_as_of || !pair.to_as_of) return null;
  const sameYear = String(pair.from_as_of).slice(0, 4) === String(pair.to_as_of).slice(0, 4);
  const from = sameYear ? shortDate(pair.from_as_of) : fmtDateId(pair.from_as_of);
  const to = fmtDateId(pair.to_as_of);
  const gap = pair.is_consecutive === false ? fill(COPY.watchlist.gap_suffix, { months: gapMonths(pair.gap_days) }) : '';
  return { from, to, gap };
}

export function countText(n) { return fill(COPY.watchlist.count, { n }); }

// Error classification for writes (design dev notes): 409 full, 403 tier_required, 404, other.
export function classifyError(res) {
  if (!res || res.status === 0) return 'network';
  const d = res.data && res.data.detail;
  const code = d && typeof d === 'object' ? d.error : null;
  if (res.status === 409 && code === 'watchlist_full') return 'full';
  if (res.status === 403 && code === 'tier_required') return 'tier';
  if (res.status === 401) return 'auth';
  if (res.status === 404) return 'notfound';
  return 'error';
}

// Static build-time sample for the Free gate preview (public KSEI facts, not an API call).
export const GATE_SAMPLE = [
  { code: 'HATM', change: { status: 'changed', n_changes: 2, net_delta_pct: 5.36, flags: [] } },
  { code: 'LUCY', change: { status: 'changed', n_changes: 7, net_delta_pct: -15.86, flags: [] } },
  { code: 'KOTA', change: { status: 'changed', n_changes: 7, net_delta_pct: 2.72, flags: [] } }
];
