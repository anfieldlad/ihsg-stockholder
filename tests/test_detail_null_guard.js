// tests/test_detail_null_guard.js — D3 regression: detailStock/detailInvestor are null while the
// detail panel is closed; Alpine may still evaluate expressions, so no unguarded member access.
import assert from 'node:assert';
import fs from 'node:fs';

console.log('Running test_detail_null_guard.js...');
const src = fs.readFileSync('public/index.html', 'utf8');
const bad = [];
src.split('\n').forEach((l, i) => {
  if (/\bdetail(Stock|Investor)\.[A-Za-z_]/.test(l)) bad.push(`${i + 1}: unguarded access: ${l.trim().slice(0, 120)}`);
  if (/\bdetail(Stock|Investor)\?\.[A-Za-z_]+\.[A-Za-z_]/.test(l)) bad.push(`${i + 1}: chain after ?. needs ?. too: ${l.trim().slice(0, 120)}`);
});
assert.deepStrictEqual(bad, [], 'Unguarded detail* access in index.html:\n' + bad.join('\n'));
assert.ok(/fmtChangePct\(detailStock\?\.changePct\)/.test(src), 'fmtChangePct uses detailStock?.changePct');
console.log('OK test_detail_null_guard.js');
