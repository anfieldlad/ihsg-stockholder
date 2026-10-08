const fs = require('fs');

function checkFile(path) {
  try {
    const content = fs.readFileSync(path, 'utf8');
    console.log(`OK: ${path} (${content.length} bytes)`);
  } catch (e) {
    console.error(`ERROR: ${path}`, e);
    process.exit(1);
  }
}

['index.html', 'components/tab-faq.html', 'components/modal-feedback.html', 'components/modal-stock.html', 'components/modal-investor.html', 'src/store.js'].forEach(checkFile);
