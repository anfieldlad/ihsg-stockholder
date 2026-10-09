import fs from 'fs';

const jsonPath = fs.existsSync('./public/shareholder_data.json') ? './public/shareholder_data.json' : './shareholder_data.json';
const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const samples = new Set();
for (const item of raw.items) {
    if (item.issuer && (item.issuer.includes('PT') || item.issuer.includes('Pt') || item.issuer.includes('TBK') || item.issuer.includes('Tbk'))) {
        samples.add(item.issuer);
        if (samples.size > 15) break;
    }
}
console.log('Sample issuers:', Array.from(samples));

const invSamples = new Set();
for (const item of raw.items) {
    if (item.investor && (item.investor.startsWith('PT.') || item.investor.startsWith('PT ') || item.investor.includes('TBK') || item.investor.includes('CV') || item.investor.includes('LTD') || item.investor.includes('PTE'))) {
        invSamples.add(item.investor);
        if (invSamples.size > 20) break;
    }
}
console.log('Sample investors:', Array.from(invSamples));
