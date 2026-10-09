import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_module_imports.js (ES Module Loading Regression Suite)...');

const srcPrefix = fs.existsSync('public/src') ? 'public/src/' : 'src/';

const requiredModules = [
  {
    path: `${srcPrefix}store.js`,
    exports: ['storeConfig']
  },
  {
    path: `${srcPrefix}api.js`,
    exports: ['fetchHolderData', 'fetchPricesBatch', 'fetchSinglePrice']
  },
  {
    path: `${srcPrefix}charts.js`,
    exports: ['loadECharts', 'renderWhaleChart', 'renderDashboardCharts', 'renderModalChart']
  },
  {
    path: `${srcPrefix}copy.js`,
    exports: ['COPY']
  },
  {
    path: `${srcPrefix}utils.js`,
    exports: ['toTitleCase', 'fmtNum', 'fmtShares', 'fmtPrice', 'fmtRp', 'fmtPct', 'fmtChangePct']
  },
  {
    path: `${srcPrefix}normalize.js`,
    exports: ['normalizeInvestorName', 'canonicalInvestorKey', 'isSameInvestor', 'canonical_investor_key']
  },
  {
    path: `${srcPrefix}analytics.js`,
    exports: [
      'ANALYTICS_CONFIG',
      'initAnalytics',
      'trackEvent',
      'trackPageview',
      'trackSearch',
      'trackOpenStock',
      'trackOpenInvestor',
      'trackLockedClick',
      'trackFeedbackOpen',
      'trackFeedbackSubmit',
      'isDntEnabled'
    ]
  }
];

let failedCount = 0;

for (const mod of requiredModules) {
  const resolvedPath = path.resolve(process.cwd(), mod.path);
  const fileUrl = pathToFileURL(resolvedPath).href;
  try {
    const imported = await import(fileUrl);
    console.log(`[PASS] Module imported successfully: ${mod.path}`);

    for (const expName of mod.exports) {
      assert(expName in imported, `Expected export '${expName}' missing from ${mod.path}`);
      assert(imported[expName] !== undefined, `Export '${expName}' is undefined in ${mod.path}`);
    }
    console.log(`       Verified expected exports: [${mod.exports.join(', ')}]`);
  } catch (err) {
    console.error(`[FAIL] Error importing module ${mod.path}:`, err);
    failedCount++;
  }
}

if (failedCount > 0) {
  console.error(`\nFAILED: ${failedCount} module(s) failed to import!`);
  process.exit(1);
}

console.log('\nAll ES module imports and export contracts verified successfully!');
