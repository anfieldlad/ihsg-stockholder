// tests/test_max_holders.js
// Regression test for Defect 4: Verify AADI top holder is 41.1% (not 1.54%)
// and that for ALL 961 stocks, holders[0].percentage equals the maximum percentage among all holders.

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storeModPath = fs.existsSync(path.resolve(__dirname, '../public/src/store.js'))
    ? '../public/src/store.js'
    : '../src/store.js';
const { storeConfig } = await import(storeModPath);

async function run() {
    console.log('--- Running test_max_holders.js ---');
    const p1 = path.resolve(__dirname, '../public/shareholder_data.json');
    const jsonPath = fs.existsSync(p1) ? p1 : path.resolve(__dirname, '../shareholder_data.json');
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    // Mock global window/document/fetch
    global.window = {
        addEventListener: () => {},
        removeEventListener: () => {},
        scrollTo: () => {},
        location: { hash: '' }
    };
    global.document = {
        body: { setAttribute: () => {} },
        getElementById: () => null
    };
    global.localStorage = {
        getItem: () => null,
        setItem: () => {}
    };
    global.fetch = async () => ({
        ok: true,
        json: async () => raw
    });

    const store = { ...storeConfig };
    await store.init();

    // 1. Check AADI
    const aadi = store.stockMap['AADI'];
    assert(aadi, 'AADI must exist in stockMap');
    assert.strictEqual(
        aadi.holders[0].percentage,
        41.1,
        `Expected AADI largest holder to be 41.1%, got ${aadi.holders[0].percentage}%`
    );
    assert.strictEqual(
        aadi.topHolder.percentage,
        41.1,
        `Expected AADI topHolder.percentage to be 41.1%, got ${aadi.topHolder.percentage}%`
    );
    assert.strictEqual(
        aadi.topHolder.investor,
        'ADARO STRATEGIC INVESTMENTS',
        `Expected AADI top holder name to be ADARO STRATEGIC INVESTMENTS, got ${aadi.topHolder.investor}`
    );
    console.log('[PASS] AADI largest holder verified: 41.1% (ADARO STRATEGIC INVESTMENTS)');

    // 2. Check ALL 961 issuers
    const stocks = Object.values(store.stockMap);
    assert.strictEqual(stocks.length, 961, `Expected 961 stocks, got ${stocks.length}`);

    let testedCount = 0;
    for (const s of stocks) {
        assert(s.holders.length > 0, `Stock ${s.code} must have at least one holder`);
        const maxPct = Math.max(...s.holders.map(h => h.percentage));
        assert.strictEqual(
            s.holders[0].percentage,
            maxPct,
            `Stock ${s.code}: holders[0].percentage (${s.holders[0].percentage}) != max percentage (${maxPct})`
        );
        assert.strictEqual(
            s.topHolder.percentage,
            maxPct,
            `Stock ${s.code}: topHolder.percentage (${s.topHolder.percentage}) != max percentage (${maxPct})`
        );
        // Verify holders array is sorted descending
        for (let i = 0; i < s.holders.length - 1; i++) {
            assert(
                s.holders[i].percentage >= s.holders[i + 1].percentage,
                `Stock ${s.code}: holders not sorted descending at index ${i}`
            );
        }
        testedCount++;
    }
    console.log(`[PASS] All ${testedCount} issuers verified: holders[0] equals max(percentage) and holders array is strictly sorted descending.`);

    console.log('[ALL PASSED] Defect 4 data bug resolved and verified!');
}

run().catch(err => {
    console.error('[FAIL]', err);
    process.exit(1);
});
