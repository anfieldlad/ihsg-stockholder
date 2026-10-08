import fs from 'node:fs';

const files = [
  'index.html',
  'components/tab-stocks.html',
  'components/tab-investors.html',
  'components/modal-stock.html',
  'components/modal-investor.html',
  'src/store.js',
  'src/charts.js',
  'src/normalize.js',
  'vercel.json'
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error(`MISSING: ${f}`);
    process.exit(1);
  }
  const stat = fs.statSync(f);
  if (stat.size === 0) {
    console.error(`EMPTY: ${f}`);
    process.exit(1);
  }
  console.log(`OK: ${f} (${stat.size} bytes)`);
}

// Verify vercel.json is valid JSON
const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
if (!vercelConfig.rewrites) {
  console.error('Invalid vercel.json structure: missing rewrites');
  process.exit(1);
}
console.log('OK: vercel.json contains valid rewrites configuration');
