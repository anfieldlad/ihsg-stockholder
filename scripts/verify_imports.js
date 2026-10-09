import fs from 'node:fs';
import path from 'node:path';

// Parse export and import declarations using regex
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Named exports:
  // export function foo
  // export const/let/var foo
  // export class foo
  // export { foo, bar as baz }
  const exports = new Set();
  
  const funcMatches = content.matchAll(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/g);
  for (const m of funcMatches) exports.add(m[1]);
  
  const varMatches = content.matchAll(/export\s+(?:const|let|var)\s+([a-zA-Z0-9_$]+)/g);
  for (const m of varMatches) exports.add(m[1]);

  const classMatches = content.matchAll(/export\s+class\s+([a-zA-Z0-9_$]+)/g);
  for (const m of classMatches) exports.add(m[1]);

  const blockExportMatches = content.matchAll(/export\s*\{([^}]+)\}/g);
  for (const m of blockExportMatches) {
    const names = m[1].split(',');
    for (let name of names) {
      name = name.trim();
      if (!name) continue;
      if (name.includes(' as ')) {
        exports.add(name.split(/\s+as\s+/)[1].trim());
      } else {
        exports.add(name);
      }
    }
  }

  // Named imports:
  // import { a, b as c } from './mod.js'
  const imports = [];
  const importMatches = content.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g);
  for (const m of importMatches) {
    const rawSpecifiers = m[1].split(',');
    const source = m[2];
    const specifiers = [];
    for (let spec of rawSpecifiers) {
      spec = spec.trim();
      if (!spec) continue;
      if (spec.includes(' as ')) {
        const [orig, alias] = spec.split(/\s+as\s+/).map(s => s.trim());
        specifiers.push({ imported: orig, local: alias });
      } else {
        specifiers.push({ imported: spec, local: spec });
      }
    }
    imports.push({ source, specifiers, line: m[0] });
  }

  // Default export
  const hasDefaultExport = /export\s+default\s+/.test(content);

  return { filePath, exports, imports, hasDefaultExport };
}

const srcDir = fs.existsSync('./public/src') ? './public/src' : './src';
const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.js')).map(f => path.join(srcDir, f));

// Also check index.html script tag
const allFiles = [...srcFiles];

console.log('Analyzing files:', allFiles);
const analyses = {};
for (const file of allFiles) {
  analyses[file] = analyzeFile(file);
}

// Also analyze index.html
const indexPath = fs.existsSync('./public/index.html') ? './public/index.html' : './index.html';
const indexHtmlContent = fs.readFileSync(indexPath, 'utf8');
const indexScriptMatches = indexHtmlContent.matchAll(/<script\s+type="module"[^>]*>([\s\S]*?)<\/script>/gi);
let idxCount = 0;
for (const sm of indexScriptMatches) {
  idxCount++;
  const pseudoPath = `${indexPath}#module-${idxCount}`;
  const scriptBody = sm[1];
  const imports = [];
  const importMatches = scriptBody.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g);
  for (const m of importMatches) {
    const rawSpecifiers = m[1].split(',');
    const source = m[2];
    const specifiers = [];
    for (let spec of rawSpecifiers) {
      spec = spec.trim();
      if (!spec) continue;
      if (spec.includes(' as ')) {
        const [orig, alias] = spec.split(/\s+as\s+/).map(s => s.trim());
        specifiers.push({ imported: orig, local: alias });
      } else {
        specifiers.push({ imported: spec, local: spec });
      }
    }
    imports.push({ source, specifiers, line: m[0] });
  }
  analyses[pseudoPath] = { filePath: pseudoPath, exports: new Set(), imports, hasDefaultExport: false };
}

console.log('\n--- EXPORTS FOUND ---');
for (const [file, a] of Object.entries(analyses)) {
  if (a.exports.size > 0) {
    console.log(`${file}:`, [...a.exports]);
  }
}

console.log('\n--- VERIFYING IMPORTS ---');
let hasErrors = false;
for (const [file, a] of Object.entries(analyses)) {
  for (const imp of a.imports) {
    let resolvedTarget = null;
    if (imp.source.startsWith('.')) {
      const baseDir = file.includes('#') ? path.dirname(indexPath) : path.dirname(file);
      resolvedTarget = path.normalize(path.join(baseDir, imp.source));
    }
    console.log(`${file} imports from ${imp.source} -> ${resolvedTarget}`);
    if (!resolvedTarget || !analyses[resolvedTarget]) {
      console.warn(`  WARNING: target ${resolvedTarget} not in analyzed files (external or non-src?)`);
      continue;
    }
    const targetAnalysis = analyses[resolvedTarget];
    for (const spec of imp.specifiers) {
      if (!targetAnalysis.exports.has(spec.imported)) {
        console.error(`  ERROR: ${file} imports '${spec.imported}' from ${imp.source}, but ${resolvedTarget} only exports: ${[...targetAnalysis.exports].join(', ')}`);
        hasErrors = true;
      } else {
        console.log(`  OK: '${spec.imported}' exported by ${resolvedTarget}`);
      }
    }
  }
}

if (hasErrors) {
  console.error('\nResult: IMPORT/EXPORT MISMATCHES DETECTED!');
  process.exit(1);
} else {
  console.log('\nResult: ALL IMPORTS AND EXPORTS MATCH PERFECTLY!');
}
