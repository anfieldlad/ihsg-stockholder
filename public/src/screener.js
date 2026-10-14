// public/src/screener.js — Pro 'Screener Saham' client-side logic & store mixin.
// Pam spec: /home/hermes/company/ihsg/design/screener-spec-ui.md (rev 1).
import { COPY } from './copy.js';
import { trackScreenerOpen, trackScreenerApply, trackScreenerClear } from './analytics.js';

export const STATE_OWNED_TYPES = new Set([
  'State Owned Enterprises',
  'State Owned Company',
  'Sovereign Wealth Fund',
  'Government'
]);

export const DAPEN_TYPES = new Set([
  'Pension Funds',
  'Insurance'
]);

export const SCREENER_DEFAULT = {
  foreign: '0',
  base: 't1',
  conc: '0',
  holders: 'all',
  tags: []
};

export const SCREENER_STORAGE_KEY = 'ihsg_screener_filters';

export const TAG_NAMES = {
  b: 'BUMN / Sovereign',
  d: 'Dapen / Asuransi',
  x: 'Institusi asing',
  m: 'Mayoritas individu'
};

export function cloneFilters(f) {
  if (!f) return { ...SCREENER_DEFAULT, tags: [] };
  return {
    foreign: String(f.foreign || '0'),
    base: f.base === 't3' ? 't3' : 't1',
    conc: String(f.conc || '0'),
    holders: f.holders || 'all',
    tags: Array.isArray(f.tags) ? [...f.tags] : []
  };
}

export function countActiveFilters(f) {
  if (!f) return 0;
  return (Number(f.foreign || 0) > 0 ? 1 : 0) +
         (Number(f.conc || 0) > 0 ? 1 : 0) +
         (f.holders && f.holders !== 'all' ? 1 : 0) +
         (Array.isArray(f.tags) ? f.tags.length : 0);
}

export function chipsText(f) {
  if (!f) return [];
  const t = [];
  if (Number(f.foreign || 0) > 0) t.push(`Asing ≥ ${f.foreign}%`);
  if (Number(f.conc || 0) > 0) t.push(`${f.base === 't3' ? 'Top 3' : 'Top 1'} ≥ ${f.conc}%`);
  if (f.holders && f.holders !== 'all') {
    t.push(f.holders === '6+' ? '> 5 pemegang' : `${f.holders.replace('-', '–')} pemegang`);
  }
  if (Array.isArray(f.tags)) {
    for (const k of f.tags) {
      if (TAG_NAMES[k]) t.push(TAG_NAMES[k]);
    }
  }
  return t;
}

export function deriveStockScreener(stock) {
  const hs = stock.holders || [];
  const p = hs.map(h => (typeof h.percentage === 'number' && !isNaN(h.percentage) ? h.percentage : 0));
  const fgn = hs.reduce((sum, h) => {
    const lf = h.local_foreign;
    return (lf === 'F' || lf === 'A') ? sum + (typeof h.percentage === 'number' && !isNaN(h.percentage) ? h.percentage : 0) : sum;
  }, 0);
  const ind = hs.reduce((sum, h) => {
    return h.investor_type === 'Individual' ? sum + (typeof h.percentage === 'number' && !isNaN(h.percentage) ? h.percentage : 0) : sum;
  }, 0);
  const tot = p.reduce((sum, v) => sum + v, 0);

  const bumn = hs.some(h => {
    if (h.investor_type && STATE_OWNED_TYPES.has(h.investor_type)) return true;
    const inv = (h.investor || '').toUpperCase();
    return inv.includes('PERSERO') || inv.includes('DANANTARA');
  });

  const dapen = hs.some(h => h.investor_type && DAPEN_TYPES.has(h.investor_type));
  const fi = hs.some(h => (h.local_foreign === 'F' || h.local_foreign === 'A') && h.investor_type && h.investor_type !== 'Individual');
  const indmaj = ind > (tot - ind);

  const top3Sum = p.slice(0, 3).reduce((sum, v) => sum + v, 0);

  const fRound = Math.round(fgn * 100) / 100;
  const t1Round = Math.round((p[0] || 0) * 100) / 100;
  const t3Round = Math.round(top3Sum * 100) / 100;

  // Cache formatted stats directly on the stock object for UI rendering
  stock.screenerForeign = fRound;
  stock.screenerTop1 = t1Round;

  return {
    c: stock.code,
    i: stock.issuer,
    n: hs.length,
    f: fRound,
    t1: t1Round,
    t3: t3Round,
    b: bumn,
    d: dapen,
    x: fi,
    m: indmaj
  };
}

export function buildScreenerIndex(stockMap) {
  if (!stockMap) return [];
  const list = Object.values(stockMap);
  return list.map(s => deriveStockScreener(s));
}

export function matchStock(s, f) {
  if (!f) return true;
  const fForeign = Number(f.foreign || 0);
  if (s.f < fForeign) return false;

  const fConc = Number(f.conc || 0);
  if (fConc > 0) {
    const val = f.base === 't3' ? s.t3 : s.t1;
    if (val < fConc) return false;
  }

  if (f.holders === '1-2' && s.n > 2) return false;
  if (f.holders === '3-5' && (s.n < 3 || s.n > 5)) return false;
  if (f.holders === '6+' && s.n < 6) return false;

  if (Array.isArray(f.tags) && f.tags.length > 0) {
    for (let i = 0; i < f.tags.length; i++) {
      if (!s[f.tags[i]]) return false;
    }
  }

  return true;
}

export function countMatches(items, f) {
  if (!Array.isArray(items)) return 0;
  let count = 0;
  for (let i = 0; i < items.length; i++) {
    if (matchStock(items[i], f)) count++;
  }
  return count;
}

export function loadScreenerFilters() {
  if (typeof window === 'undefined' || !window.sessionStorage) return cloneFilters(SCREENER_DEFAULT);
  try {
    const raw = window.sessionStorage.getItem(SCREENER_STORAGE_KEY);
    if (!raw) return cloneFilters(SCREENER_DEFAULT);
    const parsed = JSON.parse(raw);
    return cloneFilters(parsed);
  } catch (_) {
    return cloneFilters(SCREENER_DEFAULT);
  }
}

export function saveScreenerFilters(f) {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(SCREENER_STORAGE_KEY, JSON.stringify(f));
  } catch (_) {}
}

export function clearScreenerStorage() {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.removeItem(SCREENER_STORAGE_KEY);
  } catch (_) {}
}

export const screenerMixin = {
  screenerOpen: false,
  screenerFilters: cloneFilters(SCREENER_DEFAULT),
  screenerDraft: cloneFilters(SCREENER_DEFAULT),
  screenerIndex: [],
  screenerTagCounts: { b: 0, d: 0, x: 0, m: 0 },
  screenerDraftCount: 0,
  screenerProGateCount: 128,
  screenerProGateRows: [],

  get isScreenerActive() {
    return Boolean(this.isPro && countActiveFilters(this.screenerFilters) > 0);
  },

  get screenerActiveCount() {
    return this.isPro ? countActiveFilters(this.screenerFilters) : 0;
  },

  get screenerDraftActiveCount() {
    return countActiveFilters(this.screenerDraft);
  },

  get screenerActiveTags() {
    return chipsText(this.screenerFilters);
  },

  ensureScreenerIndex() {
    if (this.screenerIndex && this.screenerIndex.length > 0) return this.screenerIndex;
    if (!this.stockMap || Object.keys(this.stockMap).length === 0) return [];
    this.screenerIndex = buildScreenerIndex(this.stockMap);
    return this.screenerIndex;
  },

  updateScreenerDraftCounts() {
    const idx = this.ensureScreenerIndex();
    this.screenerDraftCount = countMatches(idx, this.screenerDraft);

    // Compute live per-tag counts given the current draft plus that tag
    ['b', 'd', 'x', 'm'].forEach(k => {
      const f = cloneFilters(this.screenerDraft);
      f.tags = f.tags.filter(t => t !== k);
      f.tags.push(k);
      this.screenerTagCounts[k] = countMatches(idx, f);
    });
  },

  screenerOpenSheet() {
    if (!this.isPro) {
      this.openPro('screener');
      return;
    }
    this.ensureScreenerIndex();
    this.screenerDraft = cloneFilters(this.screenerFilters);
    this.updateScreenerDraftCounts();
    this.screenerOpen = true;
    try { trackScreenerOpen(); } catch (_) {}

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        const closeBtn = document.getElementById('screenerClose');
        if (closeBtn) closeBtn.focus();
      });
    }
  },

  screenerCloseSheet() {
    this.screenerOpen = false;
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        const activeChip = document.getElementById('chipOn');
        const idleChip = document.getElementById('chipIdle');
        if (activeChip && !activeChip.hidden && activeChip.offsetParent !== null) {
          const btn = typeof activeChip.querySelector === 'function' ? activeChip.querySelector('button') : null;
          if (btn && typeof btn.focus === 'function') btn.focus();
        } else if (idleChip && !idleChip.hidden && idleChip.offsetParent !== null) {
          if (typeof idleChip.focus === 'function') idleChip.focus();
        }
      });
    }
  },

  screenerSetDraft(key, val) {
    this.screenerDraft[key] = val;
    this.updateScreenerDraftCounts();
  },

  screenerToggleTag(tag) {
    const tags = Array.isArray(this.screenerDraft.tags) ? [...this.screenerDraft.tags] : [];
    const idx = tags.indexOf(tag);
    if (idx > -1) {
      tags.splice(idx, 1);
    } else {
      tags.push(tag);
    }
    this.screenerDraft.tags = tags;
    this.updateScreenerDraftCounts();
  },

  screenerResetDraft() {
    this.screenerDraft = cloneFilters(SCREENER_DEFAULT);
    this.updateScreenerDraftCounts();
  },

  screenerApply() {
    if (this.screenerDraftCount === 0 && this.screenerDraftActiveCount > 0) {
      return; // Disabled per spec
    }
    this.screenerFilters = cloneFilters(this.screenerDraft);
    saveScreenerFilters(this.screenerFilters);
    this.stockFilter = 'all'; // reset standard filter chip so Screener is single source of truth
    this.screenerOpen = false;
    this.stockLimit = 30;
    this.fetchVisiblePrices();
    try { trackScreenerApply(countActiveFilters(this.screenerFilters)); } catch (_) {}

    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      window.requestAnimationFrame(() => {
        const chipsEl = document.getElementById('chips-stocks');
        if (chipsEl) chipsEl.scrollIntoView({ block: 'nearest' });
      });
    }
  },

  screenerClear() {
    this.screenerFilters = cloneFilters(SCREENER_DEFAULT);
    this.screenerDraft = cloneFilters(SCREENER_DEFAULT);
    clearScreenerStorage();
    this.stockLimit = 30;
    this.fetchVisiblePrices();
    try { trackScreenerClear(); } catch (_) {}
  },

  prepareScreenerProGate() {
    const idx = this.ensureScreenerIndex();
    const f50 = idx.filter(s => s.f >= 50);
    this.screenerProGateCount = f50.length;
    f50.sort((a, b) => b.f - a.f);
    this.screenerProGateRows = f50.slice(0, 3);
  },

  screenerOnAuthChange() {
    if (!this.isPro) {
      this.screenerClear();
      this.screenerOpen = false;
    } else {
      // Pro user restored from sessionStorage if present
      const saved = loadScreenerFilters();
      if (countActiveFilters(saved) > 0) {
        this.screenerFilters = saved;
        this.stockFilter = 'all';
      }
    }
  },

  screenerTrapKey(e) {
    if (e.key !== 'Tab' || !this.screenerOpen) return false;
    const sheet = document.getElementById('screenerSheet');
    if (!sheet) return false;
    const focusable = [...sheet.querySelectorAll('button, [href], input, select, [tabindex]:not([tabindex="-1"])')]
      .filter((el) => !el.disabled && el.offsetParent !== null);
    if (!focusable.length) return false;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.querySelector('.db'))) {
      last.focus();
      return true;
    }
    if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      return true;
    }
    return false;
  }
};
