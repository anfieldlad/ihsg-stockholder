import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_store_boot.js (Node Store Boot & Data Loading Simulation)...');

// 1. Setup browser globals for Node environment
const mockElements = new Map();

globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

globalThis.document = {
  body: {
    setAttribute(attr, val) { this[attr] = val; },
    getAttribute(attr) { return this[attr]; },
    classList: {
      add() {},
      remove() {}
    }
  },
  getElementById(id) {
    if (!mockElements.has(id)) {
      mockElements.set(id, { id, style: { display: 'none' } });
    }
    return mockElements.get(id);
  },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {}
};

globalThis.location = {
  hash: '',
  pathname: '/'
};

globalThis.history = {
  pushState(state, title, url) {}
};

globalThis.__markAppBooted = () => {
  const el = globalThis.document.getElementById('app-fallback');
  if (el) el.style.display = 'none';
};

// 2. Mock fetch to serve real shareholder_data.json from disk
const realDataJson = JSON.parse(fs.readFileSync('shareholder_data.json', 'utf8'));
console.log(`Loaded shareholder_data.json with ${realDataJson.items?.length || 0} items, as_of: ${realDataJson.as_of_label || realDataJson.source_date_in_file}`);

globalThis.fetch = async (url) => {
  if (url === 'shareholder_data.json') {
    return {
      ok: true,
      json: async () => realDataJson
    };
  }
  if (url.startsWith('/api/prices')) {
    return {
      ok: true,
      json: async () => ({ prices: {} })
    };
  }
  return {
    ok: false,
    json: async () => ({})
  };
};

// 3. Import store module
const storeModuleUrl = pathToFileURL(path.resolve(process.cwd(), 'src/store.js')).href;
const { storeConfig } = await import(storeModuleUrl);

assert(storeConfig, 'storeConfig must be exported by src/store.js');
assert.strictEqual(typeof storeConfig.init, 'function', 'storeConfig.init must be a function');

// 4. Boot the store
console.log('Invoking storeConfig.init()...');
await storeConfig.init();

// 5. Assertions on boot state
console.log('Verifying post-init state...');
assert.strictEqual(storeConfig.loading, false, 'store.loading must be false after init');
assert.strictEqual(storeConfig.error, null, 'store.error must be null after successful init');

console.log(`Total stocks: ${storeConfig.totalStocks}`);
assert(storeConfig.totalStocks > 700, `Expected >700 stocks, got ${storeConfig.totalStocks}`);

console.log(`Total investors: ${storeConfig.totalInvestors}`);
assert(storeConfig.totalInvestors > 3000, `Expected >3000 investors, got ${storeConfig.totalInvestors}`);

console.log(`Total records: ${storeConfig.totalRecords}`);
assert(storeConfig.totalRecords > 7000, `Expected >7000 records, got ${storeConfig.totalRecords}`);

// 6. Assert stock list has >0 rows
const filtered = storeConfig.filteredStocks;
console.log(`Filtered stocks count: ${filtered.length}`);
assert(filtered.length > 0, 'filteredStocks must have >0 items');

const visible = storeConfig.visibleStocks;
console.log(`Visible stocks count: ${visible.length}`);
assert(visible.length > 0, 'visibleStocks must have >0 rows');
assert.strictEqual(visible.length, 30, 'visibleStocks default pagination limit should be 30');

// Verify sample stock row structure
const firstStock = visible[0];
console.log('First stock sample:', { code: firstStock.code, issuer: firstStock.issuer, holdersCount: firstStock.holders?.length });
assert(firstStock.code, 'Stock must have a code');
assert(firstStock.issuer, 'Stock must have an issuer');
assert(Array.isArray(firstStock.holders) && firstStock.holders.length > 0, 'Stock must have holders');

// Verify BBCA exists
const bbca = storeConfig.stockMap['BBCA'];
assert(bbca, 'BBCA must exist in stockMap');
console.log(`BBCA has ${bbca.holders.length} major shareholders`);
assert(bbca.holders.length >= 2, 'BBCA must have at least 2 major shareholders');

// 7. Verify investor list has >0 rows
const investors = storeConfig.visibleInvestors;
console.log(`Visible investors count: ${investors.length}`);
assert(investors.length > 0, 'visibleInvestors must have >0 rows');
assert.strictEqual(investors.length, 30, 'visibleInvestors limit should be 30');

// 8. Test Search
storeConfig.searchQuery = 'BBCA';
const searchRes = storeConfig.searchResults;
assert(searchRes.stocks.some(s => s.code === 'BBCA'), 'Search query BBCA must find BBCA');
console.log('Search for BBCA returned:', searchRes.stocks.map(s => s.code));

// 9. Verify fallback watcher integration
assert(mockElements.get('app-fallback')?.style.display === 'none', 'app-fallback must be hidden when app is booted');

console.log('\n[SUCCESS] Node store boot verification PASSED! Stock list renders >0 rows, stats calculated, search and investor views operational.');
