/**
 * IHSG Storm — Automated Comprehensive QA Verification Suite
 * Role: Angela (QA & Release Gate)
 * Checks:
 * 1. Runtime ES Module Imports
 * 2. Store Boot & Real Data (7,154 records, 961 stocks, 5,166 investors)
 * 3. Search (Ticker, Issuer, Investor) & Filters (Warkat, Foreign, Top Holders) & Sorting
 * 4. Modals & Master-Detail Pane (Stock, Investor, Pro Sheet, Feedback, Search Palette)
 * 5. Hash Routing & Deep Linking (#/saham/..., #/investor/..., #/pro/..., #/faq, etc.)
 * 6. Charts (Pure CSS Conic Donut, CSS Bars, Analytics Calculations, Lazy ECharts)
 * 7. WCAG 2.1 AA Contrast Ratio Calculations (Theme A & Theme B)
 * 8. Responsive CSS Layout Rules (375px, 768px, 1024px, 1440px, 1920px)
 * 9. Copy Alignment vs copy-strings.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Color luminance and contrast math
function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }
    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function relativeLuminance(r, g, b) {
    const sRGB = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

function contrastRatio(hex1, hex2) {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
}

// Global test tracker
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function assert(condition, message, details = null) {
    if (condition) {
        results.passed++;
        results.tests.push({ status: 'PASS', message, details });
        console.log(`  [PASS] ${message}`);
    } else {
        results.failed++;
        results.tests.push({ status: 'FAIL', message, details });
        console.error(`  [FAIL] ${message}`);
        if (details) console.error(`         Details: ${JSON.stringify(details)}`);
    }
}

async function runQASuite() {
    console.log('===============================================================');
    console.log('IHSG Storm — Comprehensive QA Verification Suite (Angela QA Gate)');
    console.log('===============================================================\n');

    // -------------------------------------------------------------
    // GATE 1: ES MODULE IMPORT INTEGRITY
    // -------------------------------------------------------------
    console.log('--- GATE 1: ES Module Import Integrity ---');
    let storeModule, apiModule, chartsModule, copyModule, utilsModule, normalizeModule;
    try {
        storeModule = await import('../public/src/store.js');
        apiModule = await import('../public/src/api.js');
        chartsModule = await import('../public/src/charts.js');
        copyModule = await import('../public/src/copy.js');
        utilsModule = await import('../public/src/utils.js');
        normalizeModule = await import('../public/src/normalize.js');
        assert(true, 'All 6 ES modules imported without syntax or linking errors');
    } catch (err) {
        assert(false, `ES module import failed: ${err.message}`);
        return;
    }

    assert(typeof storeModule.storeConfig === 'object', 'store.js exports storeConfig object');
    assert(typeof normalizeModule.canonicalInvestorKey === 'function', 'normalize.js exports canonicalInvestorKey');
    assert(typeof normalizeModule.canonical_investor_key === 'function', 'normalize.js exports canonical_investor_key alias');
    assert(typeof copyModule.COPY === 'object', 'copy.js exports COPY object');
    assert(typeof chartsModule.loadECharts === 'function', 'charts.js exports loadECharts function');

    // -------------------------------------------------------------
    // GATE 2: STORE BOOT & REAL DATA PARSING
    // -------------------------------------------------------------
    console.log('\n--- GATE 2: Store Boot & Real Data Parsing ---');
    const dataPath = fs.existsSync(path.join(rootDir, 'public/shareholder_data.json'))
        ? path.join(rootDir, 'public/shareholder_data.json')
        : path.join(rootDir, 'shareholder_data.json');
    assert(fs.existsSync(dataPath), 'shareholder_data.json exists on disk');

    const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    assert(Array.isArray(rawData.items), 'shareholder_data.json has valid items array');
    assert(rawData.items.length === 7154, `Item count matches Sep 2026 dataset (expected 7,154, got ${rawData.items.length})`);
    assert((rawData.as_of || rawData.as_of_label) === '30 September 2026', `as_of date is '30 September 2026' (got ${rawData.as_of || rawData.as_of_label})`);

    // Setup Mock DOM
    const listeners = {};
    const elements = {};
    global.history = { pushState: () => {}, replaceState: () => {} };
    global.window = {
        addEventListener: (event, handler) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(handler);
        },
        location: { hash: '' },
        history: global.history
    };
    global.document = {
        getElementById: (id) => elements[id] || {
            classList: { add: () => {}, remove: () => {} },
            textContent: '',
            style: {},
            focus: () => {}
        },
        body: { setAttribute: () => {} }
    };
    global.localStorage = {
        store: {},
        getItem: (k) => global.localStorage.store[k] || null,
        setItem: (k, v) => { global.localStorage.store[k] = v; }
    };
    global.fetch = async () => ({
        ok: true,
        json: async () => rawData
    });

    const store = storeModule.storeConfig;
    await store.init();

    assert(store.totalStocks === 961, `Total stocks correctly aggregated: 961 (got ${store.totalStocks})`);
    assert(store.totalInvestors === 5166, `Total distinct investors correctly aggregated: 5166 (got ${store.totalInvestors})`);
    assert(store.totalRecords === 7154, `Total records correctly verified: 7154 (got ${store.totalRecords})`);
    assert(store.filteredStocks.length === 961, `Filtered stocks initial count: 961 (got ${store.filteredStocks.length})`);
    assert(store.visibleStocks.length === 30, `Visible stocks pagination initial window: 30 (got ${store.visibleStocks.length})`);
    assert(store.stockMap['BBCA'] !== undefined, 'BBCA exists in stockMap');
    assert(store.stockMap['BBCA'].holders.length === 4, `BBCA has 4 major holders (got ${store.stockMap['BBCA'].holders.length})`);
    assert(store.stockMap['TLKM'] !== undefined, 'TLKM exists in stockMap');
    assert(store.stockMap['BBRI'] !== undefined, 'BBRI exists in stockMap');
    assert(store.stockMap['ASII'] !== undefined, 'ASII exists in stockMap');

    // -------------------------------------------------------------
    // GATE 3: SEARCH, FILTER & SORTING OPERATIONS
    // -------------------------------------------------------------
    console.log('\n--- GATE 3: Search, Filters & Sorting Operations ---');

    // Ticker Search
    store.searchQuery = 'BBCA';
    let sRes = store.searchResults;
    assert((sRes.stocks || []).some(r => r.code === 'BBCA'), 'Search "BBCA" returns BBCA stock result');

    // Issuer Name Search
    store.searchQuery = 'telekomunikasi';
    sRes = store.searchResults;
    assert((sRes.stocks || []).some(r => r.code === 'TLKM'), 'Search "telekomunikasi" returns TLKM');

    // Investor Search
    store.searchQuery = 'DWI MURIA';
    sRes = store.searchResults;
    assert((sRes.investors || []).some(r => r.name.includes('DWIMURIA')), 'Search "DWI MURIA" matches PT DWIMURIA INVESTAMA ANDALAN');

    // Filter: Dominasi Asing
    store.setStockFilter('foreign');
    const foreignCount = store.filteredStocks.length;
    assert(foreignCount > 0 && foreignCount < 961, `Foreign dominated filter returns subset: ${foreignCount} stocks`);

    // Filter: Pemegang Terbanyak (>= 6 holders)
    store.setStockFilter('top_holders');
    const topHoldersCount = store.filteredStocks.length;
    assert(topHoldersCount > 0 && topHoldersCount < 961, `Top holders filter returns subset: ${topHoldersCount} stocks`);
    assert(store.filteredStocks.every(s => s.holders.length >= 6), 'All top_holders stocks have holders count >= 6');

    // Filter: Warkat / Scrip
    store.setStockFilter('scrip');
    const scripStocksCount = store.filteredStocks.length;
    assert(scripStocksCount > 0, `Scrip / Warkat filter identifies stocks with unclassified holders (${scripStocksCount} stocks)`);

    // Reset Filter
    store.setStockFilter('all');
    assert(store.filteredStocks.length === 961, 'Resetting stock filter returns all 961 stocks');

    // Investor Filters
    store.setInvFilter('individual');
    assert(store.filteredInvestors.length > 0 && store.filteredInvestors.length < 5166, `Individual investor filter active (${store.filteredInvestors.length} investors)`);
    store.setInvFilter('corporate');
    assert(store.filteredInvestors.length > 0 && store.filteredInvestors.length < 5166, `Corporate investor filter active (${store.filteredInvestors.length} investors)`);
    store.setInvFilter('scrip');
    assert(store.filteredInvestors.length > 0, `Scrip investor filter active (${store.filteredInvestors.length} warkat/unclassified investors)`);
    store.setInvFilter('all');

    // -------------------------------------------------------------
    // GATE 4: MODALS & MASTER-DETAIL PANE
    // -------------------------------------------------------------
    console.log('\n--- GATE 4: Modals & Master-Detail Pane ---');
    store.openStock('BBCA');
    assert(store.selectedStock !== null && store.selectedStock.code === 'BBCA', 'openStock("BBCA") populates selectedStock');
    assert(store.sheetOpen === true, 'openStock sets sheetOpen = true');
    assert(store.paneActive === true, 'openStock sets paneActive = true for desktop detail pane');
    assert(store.stockDonutStyle !== '', 'Conic gradient donut style calculated for BBCA');
    assert(store.stockDonutSegments.length === 4, `BBCA donut has 4 holder segments (got ${store.stockDonutSegments.length})`);
    assert(window.location.hash === '#/saham/BBCA', `URL hash updated to #/saham/BBCA (got ${window.location.hash})`);

    // Drilldown to Investor
    const bbcaTopHolder = store.selectedStock.holders[0].investor;
    store.openInvestor(bbcaTopHolder, true);
    assert(store.selectedInvestor !== null && store.selectedInvestor.name === bbcaTopHolder, 'Drilldown opens investor profile');
    assert(store.drillStack.length === 1, 'Drilldown stack contains 1 previous state');
    assert(store.drillStack[0].type === 'stock' && store.drillStack[0].arg === 'BBCA', 'Drilldown stack remembers BBCA');

    // Back Navigation
    store.popDrill();
    assert(store.selectedStock !== null && store.selectedStock.code === 'BBCA', 'popDrill() returns to BBCA');
    assert(store.drillStack.length === 0, 'Drilldown stack emptied after popDrill');

    // Close Sheet
    store.closeSheet();
    assert(store.selectedStock === null, 'closeSheet resets selectedStock to null');
    assert(store.sheetOpen === false, 'closeSheet sets sheetOpen = false');
    assert(store.paneActive === false, 'closeSheet sets paneActive = false');

    // Pro Modal
    store.openPro('test-gate');
    assert(store.proOpen === true, 'openPro sets proOpen = true');
    assert(store.proContext === 'test-gate', 'openPro tracks proContext');
    assert(window.location.hash === '#/pro/test-gate', 'URL hash updated to #/pro/test-gate');
    store.closePro();
    assert(store.proOpen === false, 'closePro sets proOpen = false');

    // Feedback Modal
    store.openFeedback('data_error', 'stock', 'BBCA', 'PT BANK CENTRAL ASIA TBK');
    assert(store.showFeedbackModal === true, 'openFeedback sets showFeedbackModal = true');
    assert(store.feedbackForm.entity_code === 'BBCA', 'Feedback entity_code prefilled to BBCA');
    assert(store.feedbackForm.entity_name === 'PT BANK CENTRAL ASIA TBK', 'Feedback entity_name prefilled');
    store.closeFeedback();
    assert(store.showFeedbackModal === false, 'closeFeedback sets showFeedbackModal = false');

    // -------------------------------------------------------------
    // GATE 5: HASH ROUTING & DEEP LINKING
    // -------------------------------------------------------------
    console.log('\n--- GATE 5: Hash Routing & Deep Linking ---');
    // Test #/saham/TLKM
    window.location.hash = '#/saham/TLKM';
    store.handleHashRoute();
    assert(store.currentTab === 'stocks', 'Route #/saham/TLKM sets currentTab to stocks');
    assert(store.selectedStock && store.selectedStock.code === 'TLKM', 'Route #/saham/TLKM opens TLKM detail');

    // Test #/stock/BBRI
    window.location.hash = '#/stock/BBRI';
    store.handleHashRoute();
    assert(store.selectedStock && store.selectedStock.code === 'BBRI', 'Route #/stock/BBRI opens BBRI detail');

    // Test #/investor/DWI%20MURIA
    window.location.hash = '#/investor/PT%20DWIMURIA%20INVESTAMA%20ANDALAN';
    store.handleHashRoute();
    assert(store.currentTab === 'investors', 'Route #/investor/... sets currentTab to investors');
    assert(store.selectedInvestor && store.selectedInvestor.name.includes('DWIMURIA'), 'Route opens PT DWIMURIA investor detail');

    // Test #/pro/screener
    window.location.hash = '#/pro/screener';
    store.handleHashRoute();
    assert(store.proOpen === true && store.proContext === 'screener', 'Route #/pro/screener opens Pro modal with context screener');
    store.closePro();

    // Test #/faq
    window.location.hash = '#/faq';
    store.handleHashRoute();
    assert(store.currentTab === 'faq', 'Route #/faq navigates to FAQ tab');

    // Test #/analytics
    window.location.hash = '#/analytics';
    store.handleHashRoute();
    assert(store.currentTab === 'analytics', 'Route #/analytics navigates to Analytics tab');

    // -------------------------------------------------------------
    // GATE 6: CHARTS & VISUALIZATION VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- GATE 6: Charts & Visualization Verification ---');
    const an = store.analyticsData;
    assert(typeof an.localPct === 'number' && an.localPct > 0, `Analytics localPct calculated: ${an.localPct}%`);
    assert(typeof an.foreignPct === 'number' && an.foreignPct > 0, `Analytics foreignPct calculated: ${an.foreignPct}%`);
    assert(typeof an.scripPct === 'number', `Analytics scripPct calculated: ${an.scripPct}%`);
    assert(an.localPct + an.foreignPct + an.scripPct === 100, `Donut percentages sum to exactly 100% (${an.localPct} + ${an.foreignPct} + ${an.scripPct})`);
    assert(an.typeBars.length > 0, `Analytics typeBars generated (${an.typeBars.length} types)`);
    assert(an.top15Bars.length === 10, `Analytics top15Bars top 10 calculated (${an.top15Bars.length} stocks)`);
    assert(an.concBars.length === 4, `Analytics concentration buckets generated (4 buckets)`);

    // Pure CSS verification in index.html
    const indexPath = fs.existsSync(path.join(rootDir, 'public/index.html'))
        ? path.join(rootDir, 'public/index.html')
        : path.join(rootDir, 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');
    assert(!indexHtml.includes('chart.js'), 'Zero Chart.js references in index.html (Chart.js fully retired)');
    assert(!indexHtml.includes('cdn.tailwindcss.com'), 'Zero Tailwind CDN references in index.html (Tailwind CDN retired)');
    assert(indexHtml.includes('conic-gradient'), 'Conic-gradient CSS donut charts implemented');

    // -------------------------------------------------------------
    // GATE 7: WCAG 2.1 AA COLOR CONTRAST RATIO AUDIT
    // -------------------------------------------------------------
    console.log('\n--- GATE 7: WCAG 2.1 AA Color Contrast Audit ---');
    const cssPath = fs.existsSync(path.join(rootDir, 'public/assets/css/style.css'))
        ? path.join(rootDir, 'public/assets/css/style.css')
        : path.join(rootDir, 'assets/css/style.css');
    const styleCss = fs.readFileSync(cssPath, 'utf8');

    // Theme A (Terang)
    // --bg: #f5f4ef, --card: #ffffff, --ink: #15181d, --ink2: #434a55, --ink3: #5f6672, --accent: #0b6e5f, --up: #0a7a4f, --down: #c0233f
    const themeA = {
        bg: '#f5f4ef',
        card: '#ffffff',
        ink: '#15181d',
        ink2: '#434a55',
        ink3: '#5f6672',
        accent: '#0b6e5f',
        up: '#0a7a4f',
        down: '#c0233f'
    };

    const cA_ink_card = contrastRatio(themeA.ink, themeA.card);
    const cA_ink2_card = contrastRatio(themeA.ink2, themeA.card);
    const cA_ink3_card = contrastRatio(themeA.ink3, themeA.card);
    const cA_accent_card = contrastRatio(themeA.accent, themeA.card);
    const cA_up_card = contrastRatio(themeA.up, themeA.card);
    const cA_down_card = contrastRatio(themeA.down, themeA.card);

    assert(cA_ink_card >= 7.0, `Theme A --ink on --card: ${cA_ink_card.toFixed(2)}:1 (exceeds AAA 7:1)`);
    assert(cA_ink2_card >= 4.5, `Theme A --ink2 on --card: ${cA_ink2_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);
    assert(cA_ink3_card >= 4.5, `Theme A --ink3 (#5f6672) on --card (#ffffff): ${cA_ink3_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);
    assert(cA_accent_card >= 4.5, `Theme A --accent on --card: ${cA_accent_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);
    assert(cA_up_card >= 4.5, `Theme A --up on --card: ${cA_up_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);
    assert(cA_down_card >= 4.5, `Theme A --down on --card: ${cA_down_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);

    // Theme B (Malam)
    // --bg: #0c1016, --card: #141a22, --ink: #e8ecf2, --ink2: #b4bcc8, --ink3: #8a94a3, --accent: #e9b44c, --up: #34d399, --down: #ff7088
    const themeB = {
        bg: '#0c1016',
        card: '#141a22',
        ink: '#e8ecf2',
        ink2: '#b4bcc8',
        ink3: '#8a94a3',
        accent: '#e9b44c',
        up: '#34d399',
        down: '#ff7088'
    };

    const cB_ink_card = contrastRatio(themeB.ink, themeB.card);
    const cB_ink2_card = contrastRatio(themeB.ink2, themeB.card);
    const cB_ink3_card = contrastRatio(themeB.ink3, themeB.card);
    const cB_accent_card = contrastRatio(themeB.accent, themeB.card);
    const cB_up_card = contrastRatio(themeB.up, themeB.card);
    const cB_down_card = contrastRatio(themeB.down, themeB.card);

    assert(cB_ink_card >= 7.0, `Theme B --ink on --card: ${cB_ink_card.toFixed(2)}:1 (exceeds AAA 7:1)`);
    assert(cB_ink2_card >= 4.5, `Theme B --ink2 on --card: ${cB_ink2_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);
    assert(cB_ink3_card >= 4.5, `Theme B --ink3 (#8a94a3) on --card (#141a22): ${cB_ink3_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);
    assert(cB_accent_card >= 4.5, `Theme B --accent on --card: ${cB_accent_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);
    assert(cB_up_card >= 4.5, `Theme B --up on --card: ${cB_up_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);
    assert(cB_down_card >= 4.5, `Theme B --down on --card: ${cB_down_card.toFixed(2)}:1 (exceeds AA 4.5:1)`);

    // -------------------------------------------------------------
    // GATE 8: RESPONSIVE LAYOUT & DESKTOP CENTERING CSS AUDIT
    // -------------------------------------------------------------
    console.log('\n--- GATE 8: Responsive Layout & Desktop Centering CSS Audit ---');
    assert(styleCss.includes('.shell {\n  width: 100%;\n  max-width: var(--maxw);\n  margin: 0 auto;'), '.shell has width: 100%, max-width: var(--maxw), margin: 0 auto (centered)');
    assert(styleCss.includes('@media(min-width: 1024px) {\n  :root {\n    --gut: 32px;\n    --maxw: 1200px;\n    --pane: 380px;'), '1024px desktop breakpoint sets --maxw: 1200px and --pane: 380px');
    assert(styleCss.includes('@media(min-width: 1440px) {\n  :root {\n    --gut: 40px;\n    --maxw: 1360px;\n    --pane: 460px;'), '1440px desktop breakpoint sets --maxw: 1360px and --pane: 460px');
    assert(styleCss.includes('@media(min-width: 1920px) {\n  :root {\n    --gut: 48px;\n    --maxw: 1600px;\n    --pane: 560px;'), '1920px desktop breakpoint sets --maxw: 1600px and --pane: 560px');
    assert(styleCss.includes('@media(min-width: 1024px) {\n  .layout.has-pane {\n    grid-template-columns: minmax(0, 1fr) var(--pane);'), 'Master-detail layout divides content into minmax(0, 1fr) and var(--pane) (no empty right side)');
    assert(styleCss.includes('.pane-empty {'), '.pane-empty class exists to display informative placeholder when no item selected');
    assert(styleCss.includes('@media(min-width: 1024px) {\n  .bnav {\n    display: none;\n  }\n  .rail {\n    display: flex;'), '1024px switches from bottom nav (.bnav) to left rail (.rail)');

    // -------------------------------------------------------------
    // GATE 9: COPY ALIGNMENT AUDIT
    // -------------------------------------------------------------
    console.log('\n--- GATE 9: Copy Alignment Audit vs copy-strings.json ---');
    const copyStringsPath = '/home/hermes/company/ihsg/copy-strings.json';
    assert(fs.existsSync(copyStringsPath), 'copy-strings.json exists at /home/hermes/company/ihsg/copy-strings.json');
    const copyRef = JSON.parse(fs.readFileSync(copyStringsPath, 'utf8'));

    // Check top-level keys
    const expectedSections = ['app', 'nav', 'freshness', 'search', 'stocks', 'investors', 'analytics', 'sheet_stock', 'sheet_investor', 'pro_gates', 'pro_sheet', 'feedback', 'states', 'disclaimer', 'investor_types', 'origin_types', 'units'];
    for (const sec of expectedSections) {
        assert(copyRef[sec] !== undefined, `Reference section "${sec}" present in copy-strings.json`);
        assert(copyModule.COPY[sec] !== undefined, `Live COPY object contains section "${sec}"`);
    }

    // Verify key string matches
    assert(copyModule.COPY.app.name === copyRef.app.name, `App name matches: "${copyRef.app.name}"`);
    assert(copyModule.COPY.app.tagline === copyRef.app.tagline, `App tagline matches: "${copyRef.app.tagline}"`);
    assert(copyModule.COPY.states.error_load === copyRef.states.error_load, `Error load copy matches: "${copyRef.states.error_load}"`);
    assert(copyModule.COPY.search.bar_placeholder === copyRef.search.bar_placeholder, `Search placeholder matches: "${copyRef.search.bar_placeholder}"`);
    assert(copyModule.COPY.feedback.title === copyRef.feedback.title, `Feedback title matches: "${copyRef.feedback.title}"`);
    assert(copyModule.COPY.disclaimer.banner === copyRef.disclaimer.banner, 'Disclaimer banner text matches exactly');

    // Verify intentional B3 hardening (no misleading prices, Segera hadir)
    assert(copyModule.COPY.pro_sheet.tier_investor === 'Investor', 'Pro sheet includes approved tier "Investor"');
    assert(copyModule.COPY.pro_sheet.price_investor === 'Segera hadir', 'Pro sheet includes approved placeholder "Segera hadir"');
    assert(copyModule.COPY.pro_sheet.tier_trader === 'Pakar / Trader', 'Pro sheet includes approved tier "Pakar / Trader"');
    assert(copyModule.COPY.pro_sheet.price_trader === 'Segera hadir', 'Pro sheet includes approved placeholder "Segera hadir"');

    console.log('\n===============================================================');
    console.log(`TOTAL CHECKS: ${results.passed + results.failed} | PASSED: ${results.passed} | FAILED: ${results.failed}`);
    console.log('===============================================================');

    if (results.failed > 0) {
        process.exit(1);
    }
}

runQASuite().catch(err => {
    console.error('Fatal test suite exception:', err);
    process.exit(1);
});
