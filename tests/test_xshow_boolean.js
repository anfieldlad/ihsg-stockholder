// tests/test_xshow_boolean.js
// Regression (WL-11): Alpine 3.13.3 throws "TypeError: u is not a function" (alpine.min.js, ~30x at load)
// when an x-show expression flips undefined -> false inside one frame: two hide callbacks are queued,
// the first deletes el._x_hidePromise, the second resolves undefined. Row price x-show bindings
// must therefore always evaluate to a real boolean.
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { fmtChangePct } from '../public/src/utils.js';
const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.resolve(here, '../public/index.html'), 'utf8');
console.log('Running test_xshow_boolean.js...');

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
const exprs = [...html.matchAll(/<span\s+x-show="([^"]*priceMap[^"]*)"/g)].map((m) => decode(m[1]));
assert.strictEqual(exprs.length, 5, 'expected 5 priceMap x-show bindings in the stock row, got ' + exprs.length);

const s = { code: 'BBCA' };
const states = [];
for (const priceLoadingBatch of [true, false]) {
  for (const entry of [undefined, { last_price: null }, { last_price: 0 }, { last_price: 9500 }, { code: 'X', failed: true, last_price: null }]) {
    states.push({ priceLoadingBatch, priceMap: entry === undefined ? {} : { BBCA: entry } });
  }
}
for (const expr of exprs) {
  const fn = new Function('scope', 's', 'fmtChangePct', `with (scope) { return (${expr}); }`);
  for (const st of states) {
    const v = fn(st, s, fmtChangePct);
    assert.strictEqual(typeof v, 'boolean', `x-show must be boolean, got ${typeof v} for "${expr}" with ${JSON.stringify(st)}`);
  }
}
console.log('OK: ' + exprs.length + ' price x-show bindings always boolean across ' + states.length + ' states');
