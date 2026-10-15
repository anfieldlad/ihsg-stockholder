// public/src/watchlist.js - Watchlist "Pantauan" store mixin (WL-4, P1).
// Spec: company/ihsg/watchlist/design.md rev 1. Backend: architecture.md 4.2 (built in WL-3).
// The server is the real gate; client gating is cosmetic. Responses are never cached or persisted,
// and the in-memory list is dropped on logout.
import { COPY } from './copy.js';
import { getToken } from './auth.js';
import { fill } from './diff.js';
import {
  WL_FEATURE, WL_MAX, WL_WARN_AT, WL_UNDO_MS, alertsUiEnabled, rowView, sortItems, summarize,
  periodParts, countText, classifyError, GATE_SAMPLE
} from './watchlist-core.js';

export async function wlFetch(method, path, body) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const init = { method, headers };
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(body); }
  try {
    const res = await fetch(path, init);
    let data = null;
    try { data = await res.json(); } catch (_) { data = null; }
    return { ok: res.ok, status: res.status, data };
  } catch (_) {
    return { ok: false, status: 0, data: null };
  }
}

function freshWl() {
  return {
    loading: false, loaded: false, error: false, lapsed: false, stale: false,
    items: [], codes: {}, pair: null, alerts: { email_alerts: false, consent_at: null }
  };
}

export const watchlistMixin = {
  W: COPY.watchlist,
  wl: freshWl(),
  wlUid: null,
  wlGateCode: '',
  wlFullOpen: false,
  wlAlertOpen: false,
  wlAlert: { loaded: false, busy: false, email_alerts: false, unsubscribed_at: null, email_masked: null, msg: '', error: false },
  wlToast: { on: false, msg: '', undo: false },
  wlAlertsUi: alertsUiEnabled(),
  wlGateSample: GATE_SAMPLE.map(rowView),
  _wlBusy: {},
  _wlEpoch: 0,
  _wlToastTimer: null,
  _wlToastUndo: null,
  _wlOpener: null,

  // ----- gating (cosmetic) -----
  get wlCan() {
    const f = this.userProfile && Array.isArray(this.userProfile.features) ? this.userProfile.features : [];
    return f.includes(WL_FEATURE);
  },
  // false while the session restores or /me is in flight: no Free-gate flash before Pro content
  get wlReady() { return !this.authRestoring && !this.tierLoading; },
  get wlLapsedCount() {
    const q = this.userProfile && this.userProfile.quota && this.userProfile.quota.watchlist;
    return q ? Number(q.used) || 0 : 0;
  },
  // 'gate' (Free / logged out) | 'lapsed' (Pro ended, items kept) | 'empty' | 'list'
  get wlMode() {
    if (!this.wlCan || this.wl.lapsed) return this.user && this.wlLapsedCount > 0 ? 'lapsed' : 'gate';
    return this.wlVisible.length ? 'list' : 'empty';
  },

  // ----- derived list state -----
  get wlVisible() { return this.wl.items.filter((it) => this.wl.codes[it.code]); },
  get wlRows() { return sortItems(this.wl.items).map((it) => ({ ...rowView(it), removing: !this.wl.codes[it.code] })); },
  get wlCount() { return Object.keys(this.wl.codes).length; },
  get wlCountText() { return countText(this.wlCount); },
  get wlCountAria() { return fill(COPY.watchlist.count_aria, { n: this.wlCount }); },
  get wlWarn() { return this.wlCount >= WL_WARN_AT; },
  get wlFull() { return this.wlCount >= WL_MAX; },
  get wlSum() { return summarize(this.wlVisible); },
  get wlNoData() { return !this.wl.pair; },
  get wlQuiet() { return !!this.wl.pair && this.wlVisible.length > 0 && this.wlSum.changed === 0; },
  get wlPeriod() {
    const p = periodParts(this.wl.pair);
    return p ? { lead: COPY.watchlist.period_lead, range: fill(COPY.watchlist.range, p), gap: p.gap } : null;
  },
  wlIsWatched(code) { return !!this.wl.codes[String(code || '').toUpperCase()]; },
  wlStarLabel(code) {
    const t = this.wlIsWatched(code) ? COPY.watchlist.star_remove : COPY.watchlist.star_add;
    return fill(t, { code });
  },
  wlT(key, vars) { return fill(COPY.watchlist[key] || key, vars); },

  // ----- lifecycle -----
  wlOnAuthChange() {
    const uid = this.user ? this.user.uid || '1' : null;
    if (uid !== this.wlUid) {
      this.wlUid = uid;
      this.wl = freshWl();
      this._wlBusy = {};
      this.wlAlert = { loaded: false, busy: false, email_alerts: false, unsubscribed_at: null, email_masked: null, msg: '', error: false };
      this.wlClose();
    }
    if (!this.user) this.wlToastHide();
    if (this.user && this.wlCan && !this.wl.loaded && !this.wl.loading) this.wlLoad();
  },

  wlOnTabOpen() {
    if (this.wlCan && (!this.wl.loaded || this.wl.stale) && !this.wl.loading) this.wlLoad();
  },

  async wlLoad() {
    if (this.wl.loading) return;
    this.wl.loading = true;
    this.wl.error = false;
    const uid = this.wlUid;
    const epoch = this._wlEpoch;
    const res = await wlFetch('GET', '/api/v1/watchlist');
    if (uid !== this.wlUid) return;
    this.wl.loading = false;
    if (res.ok && res.data && Array.isArray(res.data.items)) {
      // A write started or finished while this GET was in flight: the snapshot may predate it.
      // Keep local star state, refresh once writes settle (never resurrect a just-removed star).
      if (epoch !== this._wlEpoch && this.wl.loaded) { this.wl.stale = true; return; }
      const codes = {};
      res.data.items.forEach((it) => { codes[it.code] = true; });
      Object.keys(this._wlBusy).forEach((c) => { if (this._wlBusy[c] && this.wl.codes[c]) codes[c] = true; });
      this.wl.items = res.data.items;
      this.wl.codes = codes;
      this.wl.pair = res.data.pair || null;
      this.wl.alerts = res.data.alerts || { email_alerts: false, consent_at: null };
      this.wl.loaded = true; this.wl.stale = false; this.wl.lapsed = false;
      return;
    }
    if (classifyError(res) === 'tier') { this.wl.lapsed = true; return; }
    this.wl.error = true;
  },

  // ----- star -----
  // Reload only when no write is in flight, so a stale snapshot can never undo a local change.
  async wlRefreshIfStale() {
    if (!this.wl.stale || this.wl.loading) return;
    if (Object.values(this._wlBusy).some(Boolean)) return;
    await this.wlLoad();
  },
  async wlToggle(rawCode, opener) {
    const code = String(rawCode || '').toUpperCase();
    if (!code) return;
    this._wlOpener = opener || null;
    if (!this.wlReady) return;
    if (!this.user || !this.wlCan) { this.wlOpenGate(code); return; }
    if (!this.wl.loaded) { await this.wlLoad(); if (!this.wl.loaded) { this.wlToastShow(COPY.watchlist.toast_error); return; } }
    if (this._wlBusy[code]) return;
    if (this.wl.codes[code]) { await this.wlRemove(code); return; }
    if (this.wlFull) { this.wlOpenFull(); return; }
    await this.wlAdd(code);
  },

  async wlAdd(code, quiet) {
    this._wlBusy[code] = true;
    this._wlEpoch += 1;
    this.wl.codes = { ...this.wl.codes, [code]: true };
    const res = await wlFetch('PUT', `/api/v1/watchlist/${encodeURIComponent(code)}`);
    this._wlBusy[code] = false;
    this._wlEpoch += 1;
    if (res.ok) {
      const used = res.data && res.data.quota ? res.data.quota.used : this.wlCount;
      const row = this.wl.items.find((it) => it.code === code);
      if (!row) this.wl.stale = true;
      if (!quiet) this.wlToastShow(fill(COPY.watchlist.toast_added, { code, n: used }));
      await this.wlRefreshIfStale();
      return true;
    }
    const { [code]: _drop, ...rest } = this.wl.codes;
    this.wl.codes = rest;
    const kind = classifyError(res);
    if (kind === 'full') this.wlOpenFull();
    else if (kind === 'tier' || kind === 'auth') { this.wl.lapsed = kind === 'tier'; if (kind === 'tier') this.wlDropTier(); this.wlOpenGate(code); }
    else this.wlToastShow(COPY.watchlist.toast_error);
    return false;
  },

  async wlRemove(code) {
    this._wlBusy[code] = true;
    this._wlEpoch += 1;
    const { [code]: _drop, ...rest } = this.wl.codes;
    this.wl.codes = rest;
    const res = await wlFetch('DELETE', `/api/v1/watchlist/${encodeURIComponent(code)}`);
    this._wlBusy[code] = false;
    this._wlEpoch += 1;
    if (!res.ok) {
      this.wl.codes = { ...this.wl.codes, [code]: true };
      const kind = classifyError(res);
      if (kind === 'tier' || kind === 'auth') { this.wl.lapsed = kind === 'tier'; if (kind === 'tier') this.wlDropTier(); this.wlOpenGate(code); }
      else this.wlToastShow(COPY.watchlist.toast_error);
      return;
    }
    // The row keeps its place until the toast ends (no layout jump under the thumb).
    this.wlToastShow(fill(COPY.watchlist.toast_removed, { code }), async () => {
      await this.wlAdd(code, true);
    }, () => {
      if (!this.wl.codes[code]) this.wl.items = this.wl.items.filter((it) => it.code !== code);
    });
  },

  // ----- toast with Undo (4s, pauses while focused/hovered) -----
  wlToastShow(msg, undo, onExpire) {
    this.wlToastFlush();
    this.wlToast = { on: true, msg, undo: !!undo };
    this._wlToastUndo = undo || null;
    this._wlToastExpire = onExpire || null;
    this.wlToastArm();
  },
  wlToastArm() {
    clearTimeout(this._wlToastTimer);
    this._wlToastTimer = setTimeout(() => this.wlToastHide(), WL_UNDO_MS);
  },
  wlToastPause() { clearTimeout(this._wlToastTimer); },
  wlToastFlush() {
    clearTimeout(this._wlToastTimer);
    const fn = this._wlToastExpire;
    this._wlToastExpire = null; this._wlToastUndo = null;
    if (fn) fn();
  },
  wlToastHide() {
    this.wlToastFlush();
    this.wlToast = { on: false, msg: '', undo: false };
  },
  async wlToastUndoClick() {
    const fn = this._wlToastUndo;
    this._wlToastExpire = null; this._wlToastUndo = null;
    clearTimeout(this._wlToastTimer);
    this.wlToast = { on: false, msg: '', undo: false };
    if (fn) await fn();
  },

  // ----- sheets -----
  get wlAnyOpen() { return this.wlFullOpen || this.wlAlertOpen; },
  // Free gate reuses the shared Pro sheet (login CTA and early-access note live there).
  // Server says tier_required: the cached tier is stale (Pro lapsed mid-session). Fall back to
  // gratis locally so the shared Pro gate sheet opens instead of an error toast (design 7.3).
  wlDropTier() {
    this.userTier = 'gratis';
    this.userTierLabel = 'Gratis';
    this.userProfile = this.userProfile ? { ...this.userProfile, features: [], tier: 'gratis' } : null;
  },
  wlOpenGate(code) {
    this.wlGateCode = code || '';
    if (this.isPro) { this.wlToastShow(COPY.watchlist.toast_error); return; } // openPro is a no-op for Pro
    this.openPro('watchlist');
  },
  wlOpenFull() { this.wlFullOpen = true; this.wlFocusSheet('wlFullSheet'); },
  wlClose() {
    const was = this.wlAnyOpen;
    this.wlFullOpen = false; this.wlAlertOpen = false;
    if (was && this._wlOpener && this._wlOpener.focus) { try { this._wlOpener.focus(); } catch (_) { /* detached */ } }
    this._wlOpener = null;
  },
  wlManage() { this.wlClose(); this.setTab('watch'); },
  wlFocusSheet(id) {
    if (typeof document === 'undefined') return;
    setTimeout(() => { const el = document.querySelector(`#${id} .db`); if (el && el.focus) el.focus(); }, 60);
  },
  wlTrapKey(e) {
    if (e.key !== 'Tab' || !this.wlAnyOpen) return false;
    const id = this.wlFullOpen ? 'wlFullSheet' : 'wlAlertSheet';
    const sheet = document.getElementById(id);
    if (!sheet) return false;
    const f = [...sheet.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!f.length) return false;
    const first = f[0]; const last = f[f.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.querySelector('.db'))) { last.focus(); return true; }
    if (!e.shiftKey && document.activeElement === last) { first.focus(); return true; }
    return false;
  },

  // ----- email reminders (P2, hidden behind wlAlertsUi) -----
  get wlAlertOn() { return this.wlAlertsUi && this.wl.alerts && !!this.wl.alerts.email_alerts; },
  get wlAlertNoEmail() { return this.wlAlert.loaded && !this.wlAlert.email_masked; },
  // "Dikirim ke {email} (email akun Google Anda)" split around the masked address
  get wlAlertTo() {
    const parts = COPY.watchlist.alert.f_to.split('{email}');
    return [parts[0] || '', parts[1] || ''];
  },
  get wlAlertUnsubText() {
    const d = this.wlAlert.unsubscribed_at;
    if (!d || this.wlAlert.email_alerts) return '';
    return fill(COPY.watchlist.alert.unsubscribed_on, { date: fmtDate(d) });
  },
  async wlOpenAlerts(opener) {
    if (!this.wlAlertsUi) return;
    this._wlOpener = opener || null;
    this.wlAlert.msg = '';
    this.wlAlertOpen = true;
    this.wlFocusSheet('wlAlertSheet');
    const res = await wlFetch('GET', '/api/v1/watchlist/alerts');
    if (res.ok && res.data) {
      Object.assign(this.wlAlert, { loaded: true, error: false, email_alerts: !!res.data.email_alerts, unsubscribed_at: res.data.unsubscribed_at || null, email_masked: res.data.email_masked || null });
    } else {
      this.wlAlert.error = true;
    }
  },
  async wlAlertToggle() {
    if (this.wlAlert.busy || this.wlAlertNoEmail) return;
    const next = !this.wlAlert.email_alerts;
    this.wlAlert.busy = true;
    this.wlAlert.email_alerts = next;
    const res = await wlFetch('PUT', '/api/v1/watchlist/alerts', { email_alerts: next });
    this.wlAlert.busy = false;
    if (res.ok && res.data) {
      this.wlAlert.email_alerts = !!res.data.email_alerts;
      this.wlAlert.unsubscribed_at = res.data.unsubscribed_at || null;
      this.wl.alerts = { email_alerts: !!res.data.email_alerts, consent_at: res.data.consent_at || null };
      this.wlAlert.error = false;
      this.wlAlert.msg = next ? COPY.watchlist.alert.msg_on : COPY.watchlist.alert.msg_off;
    } else {
      this.wlAlert.email_alerts = !next;
      this.wlAlert.error = true;
      this.wlAlert.msg = COPY.watchlist.toast_error;
    }
  }
};

function fmtDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
