/**
 * IHSG Storm — Cookieless Privacy Analytics (Umami Cloud / Self-Hosted)
 *
 * Requirements:
 * - 100% Cookieless (no cookies set, no cookie consent banner required).
 * - UU PDP (UU No. 27/2022) & GDPR compliant: zero PII, no IP storage.
 * - Loaded with defer.
 * - Respects browser Do-Not-Track (DNT) header.
 * - Safe no-op when unconfigured or offline (NEVER throws, zero page impact).
 * - Measuring funnel: pageview, search, open_stock, open_investor, locked_click(feature), feedback_open.
 */

export const ANALYTICS_CONFIG = {
  /**
   * The single value required to activate analytics:
   * Paste your Umami Website ID (UUID) from Umami Cloud dashboard.
   * Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
   * If empty string, analytics operates as a silent no-op.
   */
  websiteId: '',

  /**
   * Umami script URL. Defaults to Umami Cloud, can be pointed to self-hosted instance.
   */
  scriptUrl: 'https://cloud.umami.is/script.js',

  /**
   * Respect user Do-Not-Track (DNT) browser settings.
   */
  respectDnt: true
};

/**
 * Checks whether user has enabled Do-Not-Track in their browser.
 * @returns {boolean}
 */
export function isDntEnabled() {
  try {
    if (typeof window !== 'undefined' && (window.doNotTrack === '1' || window.doNotTrack === 'yes')) {
      return true;
    }
    if (typeof navigator !== 'undefined') {
      if (
        navigator.doNotTrack === '1' ||
        navigator.doNotTrack === 'yes' ||
        navigator.msDoNotTrack === '1'
      ) {
        return true;
      }
    }
  } catch (_) {
    // Ignore any environment access errors
  }
  return false;
}

/**
 * Initializes the analytics script tag if websiteId is configured.
 * Safely skips when unconfigured, offline, or when DNT is set.
 * @param {object} [config=ANALYTICS_CONFIG]
 */
export function initAnalytics(config = ANALYTICS_CONFIG) {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    if (config.respectDnt && isDntEnabled()) {
      return;
    }

    if (!config.websiteId || typeof config.websiteId !== 'string' || !config.websiteId.trim()) {
      return;
    }

    // Check if script is already present
    const existing = document.querySelector(`script[src="${config.scriptUrl}"]`);
    if (existing) {
      return;
    }

    const script = document.createElement('script');
    script.defer = true;
    script.src = config.scriptUrl;
    script.setAttribute('data-website-id', config.websiteId.trim());
    script.setAttribute('data-auto-track', 'false'); // Pageviews handled programmatically
    script.setAttribute('data-do-not-track', 'true');
    document.head.appendChild(script);
  } catch (_) {
    // Fail safe: never throw
  }
}

/**
 * Dispatches a custom event to the analytics engine.
 * Never throws under any circumstance (adblockers, offline, script error).
 * @param {string} eventName
 * @param {object} [eventData={}]
 */
export function trackEvent(eventName, eventData = {}) {
  try {
    if (ANALYTICS_CONFIG.respectDnt && isDntEnabled()) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    if (typeof window.umami === 'object' && typeof window.umami.track === 'function') {
      window.umami.track(eventName, eventData);
    }
  } catch (_) {
    // Silent catch: analytics must never disrupt application execution
  }
}

/**
 * Funnel Event 1: Page / Tab View
 * @param {string} page - Tab name ('stocks', 'investors', 'analytics', 'faq')
 */
export function trackPageview(page) {
  trackEvent('pageview', {
    page: String(page || 'stocks')
  });
}

/**
 * Funnel Event 2: Search Executed
 * Strict privacy: records query length and results count, NEVER user query string (No PII).
 * @param {string} query
 * @param {number} resultsCount
 */
export function trackSearch(query, resultsCount = 0) {
  trackEvent('search', {
    query_length: typeof query === 'string' ? query.trim().length : 0,
    results_count: Number(resultsCount) || 0
  });
}

/**
 * Funnel Event 3: Stock Modal / Detail Opened
 * @param {string} ticker - Stock ticker code (e.g. 'BBCA', 'TLKM')
 */
export function trackOpenStock(ticker) {
  trackEvent('open_stock', {
    ticker: String(ticker || '').toUpperCase()
  });
}

/**
 * Funnel Event 4: Investor Modal / Detail Opened
 * Strict privacy: records investor type category, NEVER individual personal name (No PII).
 * @param {string} investorType - Categorical type (e.g. 'Perorangan', 'Perseroan Terbatas', 'Asing')
 */
export function trackOpenInvestor(investorType) {
  trackEvent('open_investor', {
    investor_type: String(investorType || 'Lainnya')
  });
}

/**
 * Funnel Event 5: Locked Feature Clicked (Pro Conversion Funnel)
 * @param {string} feature - Feature identifier (e.g. 'screener', 'investor_rank', 'delta')
 */
export function trackLockedClick(feature) {
  trackEvent('locked_click', {
    feature: String(feature || 'general')
  });
}

/**
 * Funnel Event 6: Feedback / Support Form Opened
 * @param {string} context - Context ('data_error', 'feature_request', 'general')
 */
export function trackFeedbackOpen(context) {
  trackEvent('feedback_open', {
    context: String(context || 'general')
  });
}
