import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_module_imports.js (ES Module Loading Regression Suite)...');

const requiredModules = [
  {
    path: 'src/store.js',
    exports: ['storeConfig']
  },
  {
    path: 'src/api.js',
    exports: ['fetchHolderData', 'fetchPricesBatch', 'fetchSinglePrice']
  },
  {
    path: 'src/charts.js',
    exports: ['loadECharts', 'renderWhaleChart', 'renderDashboardCharts', 'renderModalChart']
  },
  {
    path: 'src/copy.js',
    exports: ['COPY']
  },
  {
    path: 'src/utils.js',
    exports: ['toTitleCase', 'fmtNum', 'fmtShares', 'fmtPrice', 'fmtRp', 'fmtPct', 'fmtChangePct']
  },
  {
    path: 'src/normalize.js',
    exports: ['normalizeInvestorName', 'canonicalInvestorKey', 'isSameInvestor', 'canonical_investor_key']
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
