import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const prefix = fs.existsSync('public') ? 'public/' : '';

const files = [
  `${prefix}index.html`,
  `${prefix}assets/css/style.css`,
  `${prefix}assets/fonts/fonts.css`,
  `${prefix}components/tab-stocks.html`,
  `${prefix}components/tab-investors.html`,
  `${prefix}components/tab-analytics.html`,
  `${prefix}components/tab-faq.html`,
  `${prefix}components/modal-stock.html`,
  `${prefix}components/modal-investor.html`,
  `${prefix}components/modal-feedback.html`,
  `${prefix}src/store.js`,
  `${prefix}src/charts.js`,
  `${prefix}src/normalize.js`,
  `${prefix}src/analytics.js`,
  `${prefix}src/copy.js`,
  `${prefix}src/utils.js`,
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

// Run module import regression check
const modPrefix = fs.existsSync('public/src') ? 'public/src/' : 'src/';
const requiredModules = ['store.js', 'api.js', 'charts.js', 'copy.js', 'utils.js', 'normalize.js', 'analytics.js'].map(m => `${modPrefix}${m}`);
for (const mod of requiredModules) {
  const fileUrl = pathToFileURL(path.resolve(process.cwd(), mod)).href;
  try {
    await import(fileUrl);
    console.log(`OK module import: ${mod}`);
  } catch (err) {
    console.error(`MODULE IMPORT ERROR: ${mod}`, err);
    process.exit(1);
  }
}
