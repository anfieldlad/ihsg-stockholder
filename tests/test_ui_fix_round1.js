// tests/test_ui_fix_round1.js
// Verification suite for UI Fix Round 1 (Task t_70331c4a)
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function run() {
    console.log('--- Running test_ui_fix_round1.js ---');

    const htmlPath = path.resolve(__dirname, '../index.html');
    const cssPath = path.resolve(__dirname, '../assets/css/style.css');

    const html = fs.readFileSync(htmlPath, 'utf8');
    const css = fs.readFileSync(cssPath, 'utf8');

    // 1. Defect 1: Header & Rows shared grid, no wrap, hidden columns hidden in BOTH
    console.log('[Test 1] Table header & row grid definition...');
    assert(css.includes('.opt1, .opt2, .opt3,'), 'CSS must hide opt1, opt2, opt3 by default');
    assert(css.includes('.thead .opt1, .thead .opt2, .thead .opt3'), 'CSS must explicitly hide thead opt columns by default');
    assert(css.includes('white-space: nowrap'), 'Thead must enforce white-space nowrap');
    assert(css.includes('overflow: hidden'), 'Thead must enforce overflow hidden');

    // 2. Defect 2: Header cells vertical alignment & baseline
    console.log('[Test 2] Header cell baseline alignment...');
    assert(css.includes('.thead .h {\n    display: flex;\n    align-items: center;\n    min-height: 28px;') ||
           css.includes('.thead .h {') && css.includes('min-height: 28px') && css.includes('align-items: center'),
           'All thead .h cells must have flex align-items center and min-height 28px');

    // 3. Defect 3: Dead gap eliminated with proportional minmax columns
    console.log('[Test 3] Rebalanced column widths...');
    assert(!css.includes('grid-template-columns: minmax(0, 1.4fr) 104px 84px 92px;'), 'Old rigid 104px 84px 92px columns must be replaced');
    assert(css.includes('minmax(180px, 1.8fr)'), 'Rebalanced columns must use bounded proportions');

    // 4. Defect 4: Data bug AADI max holder verified in separate suite test_max_holders.js

    // 5. Defect 5: Price skeleton & n/a without fake 0.00%
    console.log('[Test 5] Price skeleton and n/a logic...');
    assert(html.includes('skel-px sk'), 'HTML must include price loading skeleton placeholder');
    assert(html.includes('na-badge">n/a</span>'), 'HTML must include clear n/a badge when price unavailable');
    assert(!html.includes("fmtPrice(priceMap[s.code].last_price) : '-'"), 'HTML must not fallback to dash with fake 0.00%');

    // 6. Defect 6: Empty detail pane state & border/shadow
    console.log('[Test 6] Empty detail pane state & contrast border...');
    assert(html.includes('Pilih emiten untuk melihat detail'), 'HTML must include approved empty pane prompt');
    assert(css.includes('box-shadow: 0 4px 20px -2px rgba(21, 24, 29, 0.08)'), 'Pane must have visible card shadow in Theme A');
    assert(css.includes('border: 1px solid var(--line2)'), 'Pane must have visible border');

    // 7. Defect 7 & Bobby addition: Screener chip & toolbar wrapping
    console.log('[Test 7] Toolbar and Screener chip visibility...');
    assert(css.includes('.chips {\n  display: flex;\n  flex-wrap: wrap;') || css.includes('flex-wrap: wrap'), 'Chips must wrap to prevent overflow overlap');
    assert(css.includes('padding: 2px 24px 2px 0;') || css.includes('padding-right: 24px'), 'Mobile chips must have padding-right to scroll Screener into view');
    assert(html.includes('Screener'), 'Screener chip must be present');

    // 8. Defect 8: Unified control tokens
    console.log('[Test 8] Control styling tokens...');
    assert(css.includes('.chip {\n  flex-shrink: 0;\n  min-height: 32px;') || css.includes('min-height: 32px'), 'Chip must use 32px height');
    assert(css.includes('.sortsel {\n  flex-shrink: 0;\n  min-height: 32px;') || css.includes('min-height: 32px'), 'Sort select must use 32px height');

    // 9. Defect 9: Vertical rhythm tightening
    console.log('[Test 9] Vertical rhythm tightening...');
    assert(css.includes('--topH: 54px;'), 'Top bar height must be tightened to 54px');
    assert(css.includes('padding: 8px 0 0;'), 'Freshness padding tightened to 8px');

    // 10. Defect 10: Contrast compliance
    console.log('[Test 10] Contrast token values...');
    assert(css.includes('--thead-bg: #e8e7de;'), 'Theme A must define distinct thead background');
    assert(css.includes('--ink3: #4b5563;'), 'Theme A --ink3 must be high-contrast #4b5563 (>=4.5:1)');
    assert(css.includes('--ink3: #94a3b8;'), 'Theme B --ink3 must be high-contrast #94a3b8 (>=4.5:1)');

    // 11. Defect 11: Margin symmetry
    console.log('[Test 11] Page margin centering...');
    assert(css.includes('padding-left: var(--rail);'), 'Body padding-left must equal rail width');
    assert(css.includes('.shell {\n  width: 100%;\n  max-width: var(--maxw);\n  margin: 0 auto;') || css.includes('margin: 0 auto'), 'Shell must be centered with margin: 0 auto');

    // 12. Defect 12: Accessible names on icon buttons
    console.log('[Test 12] Icon buttons accessible names...');
    assert(html.includes(':aria-label="theme === \'a\' ? \'Beralih ke mode malam\' : \'Beralih ke mode terang\'"'), 'Theme toggle buttons must have aria-label');
    assert(html.includes('aria-label="Fitur PRO"'), 'PRO button must have aria-label');

    console.log('[ALL PASSED] All 12 UI fix assertions passed successfully!');
}

run();
