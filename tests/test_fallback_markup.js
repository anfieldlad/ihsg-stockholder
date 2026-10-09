import assert from 'node:assert';
import fs from 'node:fs';

console.log('Running test_fallback_markup.js...');

const indexPath = fs.existsSync('public/index.html') ? 'public/index.html' : 'index.html';
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const copyStrings = JSON.parse(fs.readFileSync('/home/hermes/company/ihsg/copy-strings.json', 'utf8'));
const expectedErrorMsg = copyStrings.states.error_load;

console.log(`Expected fallback copy: "${expectedErrorMsg}"`);

// 1. Verify noscript notice exists
assert(indexHtml.includes('<noscript>'), 'index.html must include <noscript> tag');
assert(indexHtml.includes(expectedErrorMsg), 'index.html must include expected error_load string');

// 2. Verify noscript contains the error message
const noscriptMatch = indexHtml.match(/<noscript>([\s\S]*?)<\/noscript>/i);
assert(noscriptMatch, '<noscript> block must be found in index.html');
assert(noscriptMatch[1].includes(expectedErrorMsg), '<noscript> must contain states.error_load copy');

// 3. Verify neutral loading panel exists with states.loading copy
const loadingMatch = indexHtml.match(/<div[^>]*id="app-loading"[^>]*>([\s\S]*?)<\/div>/i);
assert(loadingMatch, '#app-loading container must exist in index.html');
assert(indexHtml.includes(copyStrings.states.loading), 'index.html must contain states.loading copy in loading panel');

// 4. Verify app-fallback element exists with error copy
const fallbackMatch = indexHtml.match(/<div[^>]*id="app-fallback"[^>]*>([\s\S]*?)<\/div>/i);
assert(fallbackMatch, '#app-fallback container must exist in index.html');
assert(fallbackMatch[1].includes(expectedErrorMsg), '#app-fallback must contain states.error_load copy');

// 5. Verify script watcher exists with error listener, 8s progress hint, 25s timeout, and boot hook
assert(indexHtml.includes("window.addEventListener('error'"), 'index.html must attach unhandled error listener');
assert(indexHtml.includes('8000'), 'index.html must specify ~8s (8000ms) progress hint timeout');
assert(indexHtml.includes('Koneksi lambat, masih memuat...'), 'index.html must include slow connection hint copy');
assert(indexHtml.includes('25000'), 'index.html must specify ~25s (25000ms) long fallback timeout');
assert(indexHtml.includes('__markAppBooted'), 'index.html must integrate __markAppBooted hook');

console.log('[SUCCESS] Fallback markup and watcher verification PASSED!');
