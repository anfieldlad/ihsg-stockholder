import assert from 'node:assert';
import fs from 'node:fs';

console.log('Running test_fallback_markup.js...');

const indexHtml = fs.readFileSync('index.html', 'utf8');
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

// 3. Verify app-fallback element exists with error copy
const fallbackMatch = indexHtml.match(/<div[^>]*id="app-fallback"[^>]*>([\s\S]*?)<\/div>/i);
assert(fallbackMatch, '#app-fallback container must exist in index.html');
assert(fallbackMatch[1].includes(expectedErrorMsg), '#app-fallback must contain states.error_load copy');

// 4. Verify script watcher exists with 3000ms timeout and error listener
assert(indexHtml.includes("window.addEventListener('error'"), 'index.html must attach unhandled error listener');
assert(indexHtml.includes('3000'), 'index.html must specify ~3s (3000ms) fallback timeout');
assert(indexHtml.includes('__markAppBooted'), 'index.html must integrate __markAppBooted hook');

console.log('[SUCCESS] Fallback markup and watcher verification PASSED!');
