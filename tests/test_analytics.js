import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Resolve analytics.js path (supports both public/src and src/)
const analyticsRelPath = fs.existsSync('public/src/analytics.js')
  ? 'public/src/analytics.js'
  : 'src/analytics.js';
const analyticsFileUrl = pathToFileURL(path.resolve(process.cwd(), analyticsRelPath)).href;

const {
  ANALYTICS_CONFIG,
  initAnalytics,
  trackEvent,
  trackPageview,
  trackSearch,
  trackOpenStock,
  trackOpenInvestor,
  trackLockedClick,
  trackFeedbackOpen,
  trackFeedbackSubmit,
  trackLoginStart,
  trackLoginSuccess,
  isDntEnabled
} = await import(analyticsFileUrl);

console.log('--- Running test_analytics.js (Cookieless Analytics Suite) ---');

// Test 1: Configuration default values & alert quota
console.log('[Test 1] Analytics configuration defaults & quota alerts...');
assert.strictEqual(typeof ANALYTICS_CONFIG, 'object', 'ANALYTICS_CONFIG must be an object');
assert(
  ANALYTICS_CONFIG.websiteId === '' || ANALYTICS_CONFIG.websiteId === '010bf3dc-512c-49e6-977a-11bf3a265b1b',
  'websiteId must be valid UUID or empty string'
);
assert.strictEqual(ANALYTICS_CONFIG.scriptUrl, 'https://cloud.umami.is/script.js', 'scriptUrl must default to Umami Cloud');
assert.strictEqual(ANALYTICS_CONFIG.respectDnt, true, 'respectDnt must default to true');
assert.strictEqual(ANALYTICS_CONFIG.alertThresholdEvents, 80000, 'alertThresholdEvents must be 80,000 per M0-4');
console.log('  [PASS] Default config verified: empty websiteId, Umami cloud URL, respectDnt=true, alertThreshold=80k');

// Test 2: Do-Not-Track detection
console.log('[Test 2] Do-Not-Track (DNT) detection...');
assert.strictEqual(typeof isDntEnabled, 'function', 'isDntEnabled must be a function');
assert.strictEqual(isDntEnabled(), false, 'isDntEnabled() returns false when no DNT signal set');

// Mock navigator.doNotTrack = '1'
try {
  Object.defineProperty(globalThis.navigator, 'doNotTrack', { value: '1', configurable: true, writable: true });
} catch (_) {
  globalThis.navigator = { doNotTrack: '1' };
}
assert.strictEqual(isDntEnabled(), true, 'isDntEnabled() detects navigator.doNotTrack = "1"');

// Mock window.doNotTrack = '1'
Object.defineProperty(globalThis.navigator, 'doNotTrack', { value: '0', configurable: true, writable: true });
globalThis.window = { doNotTrack: '1' };
assert.strictEqual(isDntEnabled(), true, 'isDntEnabled() detects window.doNotTrack = "1"');

// Reset globals
delete globalThis.window;
Object.defineProperty(globalThis.navigator, 'doNotTrack', { value: undefined, configurable: true, writable: true });
console.log('  [PASS] DNT detection verified across navigator and window');

// Test 3: Safe no-op when unconfigured or offline (never throws)
console.log('[Test 3] Safe no-op when unconfigured (never throws)...');
assert.doesNotThrow(() => initAnalytics(), 'initAnalytics must not throw when unconfigured');
assert.doesNotThrow(() => trackEvent('test_event', { foo: 'bar' }), 'trackEvent must not throw');
assert.doesNotThrow(() => trackPageview('stocks'), 'trackPageview must not throw');
assert.doesNotThrow(() => trackSearch('BBCA', 1), 'trackSearch must not throw');
assert.doesNotThrow(() => trackOpenStock('BBCA'), 'trackOpenStock must not throw');
assert.doesNotThrow(() => trackOpenInvestor('Perorangan'), 'trackOpenInvestor must not throw');
assert.doesNotThrow(() => trackLockedClick('screener'), 'trackLockedClick must not throw');
assert.doesNotThrow(() => trackFeedbackOpen('data_error'), 'trackFeedbackOpen must not throw');
assert.doesNotThrow(() => trackFeedbackSubmit('data_error'), 'trackFeedbackSubmit must not throw');
console.log('  [PASS] Safe no-op verified for all tracking calls when websiteId is empty');

// Test 4: Event dispatch when umami is active
console.log('[Test 4] Custom event tracking with Umami mock...');
const recordedEvents = [];
globalThis.window = {
  umami: {
    track: (name, data) => {
      recordedEvents.push({ name, data });
    }
  }
};

// Test trackPageview
trackPageview('stocks');
assert.strictEqual(recordedEvents.length, 1);
assert.strictEqual(recordedEvents[0].name, 'pageview');
assert.deepStrictEqual(recordedEvents[0].data, { page: 'stocks' });

// Test trackOpenStock
trackOpenStock('BBCA');
assert.strictEqual(recordedEvents.length, 2);
assert.strictEqual(recordedEvents[1].name, 'open_stock');
assert.deepStrictEqual(recordedEvents[1].data, { ticker: 'BBCA' });

// Test trackOpenInvestor (No PII: type only)
trackOpenInvestor('Perorangan');
assert.strictEqual(recordedEvents.length, 3);
assert.strictEqual(recordedEvents[2].name, 'open_investor');
assert.deepStrictEqual(recordedEvents[2].data, { investor_type: 'Perorangan' });

// Test trackLockedClick
trackLockedClick('screener');
assert.strictEqual(recordedEvents.length, 4);
assert.strictEqual(recordedEvents[3].name, 'locked_click');
assert.deepStrictEqual(recordedEvents[3].data, { feature: 'screener' });

// Test trackFeedbackOpen
trackFeedbackOpen('feature_request');
assert.strictEqual(recordedEvents.length, 5);
assert.strictEqual(recordedEvents[4].name, 'feedback_open');
assert.deepStrictEqual(recordedEvents[4].data, { context: 'feature_request' });

// Test trackSearch (No PII: query length and results count, not raw user query)
trackSearch('BBRI', 4);
assert.strictEqual(recordedEvents.length, 6);
assert.strictEqual(recordedEvents[5].name, 'search');
assert.strictEqual(recordedEvents[5].data.query_length, 4);
assert.strictEqual(recordedEvents[5].data.results_count, 4);
assert.strictEqual(recordedEvents[5].data.query, undefined, 'Must not store raw search query to protect privacy');

// Test trackFeedbackSubmit (M0-4 Funnel Event 8: Feedback Submitted)
trackFeedbackSubmit('data_error');
assert.strictEqual(recordedEvents.length, 7);
assert.strictEqual(recordedEvents[6].name, 'feedback_submit');
assert.deepStrictEqual(recordedEvents[6].data, { category: 'data_error' });
assert.strictEqual(recordedEvents[6].data.message, undefined, 'Must not store feedback message to protect privacy');
assert.strictEqual(recordedEvents[6].data.contact, undefined, 'Must not store contact info to protect privacy');

// Test trackLoginStart & trackLoginSuccess (M1-3 Auth Funnel Events)
trackLoginStart();
assert.strictEqual(recordedEvents.length, 8);
assert.strictEqual(recordedEvents[7].name, 'login_start');

trackLoginSuccess();
assert.strictEqual(recordedEvents.length, 9);
assert.strictEqual(recordedEvents[8].name, 'login_success');
console.log('  [PASS] All 9 funnel events verified with correct names and PII-free payloads');

// Test 5: Exception suppression (never throw if umami.track throws)
console.log('[Test 5] Exception suppression...');
globalThis.window.umami.track = () => {
  throw new Error('Network / AdBlock error simulated');
};

assert.doesNotThrow(() => trackEvent('fail_event'), 'trackEvent must catch errors silently');
assert.doesNotThrow(() => trackPageview('faq'), 'trackPageview must catch errors silently');
assert.doesNotThrow(() => trackLockedClick('delta'), 'trackLockedClick must catch errors silently');
assert.doesNotThrow(() => trackFeedbackSubmit('general'), 'trackFeedbackSubmit must catch errors silently');
console.log('  [PASS] Error suppression verified: never throws on tracker failure');

// Test 6: DNT prevents tracking even when umami is present
console.log('[Test 6] DNT suppresses tracking when active...');
let calledWhileDnt = false;
globalThis.window.umami.track = () => {
  calledWhileDnt = true;
};
Object.defineProperty(globalThis.navigator, 'doNotTrack', { value: '1', configurable: true, writable: true });
trackEvent('dnt_blocked_event');
assert.strictEqual(calledWhileDnt, false, 'trackEvent must not dispatch when DNT is 1');
console.log('  [PASS] Tracking properly suppressed under Do-Not-Track');

// Cleanup
delete globalThis.window;
Object.defineProperty(globalThis.navigator, 'doNotTrack', { value: undefined, configurable: true, writable: true });

console.log('\n[ALL PASSED] Cookieless analytics suite verified successfully!');
