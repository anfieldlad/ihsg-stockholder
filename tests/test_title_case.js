import assert from 'assert';
import fs from 'node:fs';

const modPath = fs.existsSync(new URL('../public/src/utils.js', import.meta.url)) 
  ? '../public/src/utils.js' 
  : '../src/utils.js';
const { toTitleCase } = await import(modPath);

console.log('Testing toTitleCase...');

assert.strictEqual(toTitleCase('ADARO ANDALAN INDONESIA Tbk'), 'Adaro Andalan Indonesia Tbk');
assert.strictEqual(toTitleCase('PT. GOLDEN ARISTA'), 'PT Golden Arista');
assert.strictEqual(toTitleCase('PT.Grid One Media'), 'PT Grid One Media');
assert.strictEqual(toTitleCase('PT RENALDIJAYA'), 'PT Renaldijaya');
assert.strictEqual(toTitleCase('SARATOGA INVESTAMA SEDAYA TBK'), 'Saratoga Investama Sedaya Tbk');
assert.strictEqual(toTitleCase('ADHI KARYA (PERSERO) Tbk'), 'Adhi Karya (Persero) Tbk');
assert.strictEqual(toTitleCase('MAYBANK SECURITIES PTE. LTD.'), 'Maybank Securities Pte. Ltd.');
assert.strictEqual(toTitleCase('Industrial Bank OF Korea'), 'Industrial Bank of Korea');

console.log('[PASS] All toTitleCase tests passed!');
