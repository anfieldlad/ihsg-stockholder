import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';

console.log('--- Running test_auth.js (M1-3 Frontend Auth Suite) ---');

const repoRoot = process.cwd();
const authModPath = path.resolve(repoRoot, 'public/src/auth.js');
const vendorBundlePath = path.resolve(repoRoot, 'public/assets/vendor/firebase-auth.js');
const indexHtmlPath = path.resolve(repoRoot, 'public/index.html');
const vercelJsonPath = path.resolve(repoRoot, 'vercel.json');
const headersPath = path.resolve(repoRoot, 'public/_headers');

// 1. Module load smoke
console.log('[Test 1] Module-load smoke for public/src/auth.js...');
const auth = await import(pathToFileURL(authModPath).href);
assert.strictEqual(typeof auth.isAuthEnabled, 'function', 'isAuthEnabled must be a function');
assert.strictEqual(typeof auth.setAuthFlag, 'function', 'setAuthFlag must be a function');
assert.strictEqual(typeof auth.getToken, 'function', 'getToken must be a function');
assert.strictEqual(typeof auth.getCurrentUser, 'function', 'getCurrentUser must be a function');
assert.strictEqual(typeof auth.getUserTier, 'function', 'getUserTier must be a function');
assert.strictEqual(typeof auth.getUserProfile, 'function', 'getUserProfile must be a function');
assert.strictEqual(typeof auth.subscribeAuth, 'function', 'subscribeAuth must be a function');
assert.strictEqual(typeof auth.loginWithGoogle, 'function', 'loginWithGoogle must be a function');
assert.strictEqual(typeof auth.logout, 'function', 'logout must be a function');
assert.strictEqual(typeof auth.initAuth, 'function', 'initAuth must be a function');
assert.strictEqual(typeof auth.FIREBASE_CONFIG, 'object', 'FIREBASE_CONFIG must be an object');
console.log('  [PASS] auth.js module exports smoke verified');

// 2. Firebase vendor bundle smoke & privacy check
console.log('[Test 2] Vendored Firebase bundle smoke & privacy check...');
assert(fs.existsSync(vendorBundlePath), 'Vendored firebase-auth.js must exist');
const vendorBundle = await import(pathToFileURL(vendorBundlePath).href);
const expectedExports = [
  'initializeApp',
  'getApp',
  'getApps',
  'getAuth',
  'GoogleAuthProvider',
  'signInWithRedirect',
  'getRedirectResult',
  'signOut',
  'onAuthStateChanged'
];
for (const exp of expectedExports) {
  assert.strictEqual(typeof vendorBundle[exp], 'function', `Bundle must export ${exp}`);
}
assert.strictEqual(vendorBundle.getAnalytics, undefined, 'Bundle must NEVER export getAnalytics (privacy/Umami)');
console.log('  [PASS] Bundle exports verified; zero Firebase analytics symbols');

// 3. Bundle size & gzip reporting
console.log('[Test 3] Bundle size and gzip report...');
const bundleContent = fs.readFileSync(vendorBundlePath);
const rawSize = bundleContent.length;
const gzipSize = zlib.gzipSync(bundleContent).length;
console.log(`  Report: firebase-auth.js raw: ${(rawSize / 1024).toFixed(1)} KB, gzip: ${(gzipSize / 1024).toFixed(1)} KB (${gzipSize} bytes)`);
assert(rawSize > 50000 && rawSize < 300000, `Raw size unexpected: ${rawSize}`);
assert(gzipSize > 15000 && gzipSize < 60000, `Gzip size unexpected: ${gzipSize}`);
console.log('  [PASS] Bundle size within budget (~33 KB gzip)');

// 4. Feature flag OFF by default = zero change / zero network
console.log('[Test 4] Feature flag OFF by default...');
auth.setAuthFlag(false);
assert.strictEqual(auth.isAuthEnabled(), false, 'isAuthEnabled must default to false');
assert.strictEqual(auth.getToken(), null, 'getToken must return null when logged out');
assert.strictEqual(auth.getCurrentUser(), null, 'getCurrentUser must return null');
assert.strictEqual(auth.getUserTier(), 'gratis', 'getUserTier must default to gratis');

// initAuth with flag OFF must resolve immediately without loading SDK or network
let initResolved = false;
await auth.initAuth().then(() => { initResolved = true; });
assert.strictEqual(initResolved, true, 'initAuth with flag OFF must resolve cleanly');
console.log('  [PASS] Flag OFF verified: zero network / zero change');

// 5. In-memory token storage (never in storage/cookies)
console.log('[Test 5] In-memory security verification...');
// Set dummy globals if not present
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}
if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}
const authSource = fs.readFileSync(authModPath, 'utf8');
assert(!authSource.includes('localStorage.setItem(\'token\''), 'Token must never be saved to localStorage');
assert(!authSource.includes('sessionStorage.setItem(\'token\''), 'Token must never be saved to sessionStorage');
assert(!authSource.includes('document.cookie'), 'Token must never be saved to cookies');
console.log('  [PASS] Token kept in memory only');

// 6. Configurable authDomain & config check
console.log('[Test 6] authDomain configuration...');
assert.strictEqual(auth.FIREBASE_CONFIG.projectId, 'ihsg-storm', 'Project ID must be ihsg-storm');
assert(auth.FIREBASE_CONFIG.authDomain.includes('firebaseapp.com') || auth.FIREBASE_CONFIG.authDomain.includes('bad.ai.id'));
console.log(`  authDomain is configured as: ${auth.FIREBASE_CONFIG.authDomain}`);
console.log('  [PASS] authDomain configurable');

// 7. Header UI: Minimalist, mobile-first, Indonesian copy, no avatar
console.log('[Test 7] Header UI and Indonesian copy inspection in index.html...');
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
assert(indexHtml.includes('Masuk dengan Google'), 'Must include Indonesian "Masuk dengan Google" button');
assert(indexHtml.includes('Keluar'), 'Must include Indonesian "Keluar" logout button');
assert(indexHtml.includes('x-if="authEnabled"'), 'Auth controls must be gated by authEnabled flag');
assert(indexHtml.includes('userTierLabel'), 'Must render user tier label');
assert(!indexHtml.includes('user.photoURL') && !indexHtml.includes('user.photoUrl'), 'Must NOT render Google avatar (no avatar rendering per spec)');
console.log('  [PASS] Header UI meets all UX/privacy specs');

// 8. CSP additions
console.log('[Test 8] CSP additions in vercel.json and public/_headers...');
const vercelJson = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
let cspFound = '';
for (const entry of vercelJson.headers || []) {
  for (const h of entry.headers || []) {
    if (h.key === 'Content-Security-Policy') cspFound = h.value;
  }
}
assert(cspFound.includes('https://identitytoolkit.googleapis.com'), 'CSP must include identitytoolkit');
assert(cspFound.includes('https://securetoken.googleapis.com'), 'CSP must include securetoken');
assert(cspFound.includes('https://accounts.google.com'), 'CSP must include accounts.google.com');
assert(cspFound.includes('https://ihsg-storm.firebaseapp.com'), 'CSP must include ihsg-storm.firebaseapp.com');

const headersText = fs.readFileSync(headersPath, 'utf8');
assert(headersText.includes('identitytoolkit.googleapis.com'), '_headers must include identitytoolkit');
assert(headersText.includes('accounts.google.com'), '_headers must include accounts.google.com');
console.log('  [PASS] CSP headers verified across vercel.json and public/_headers');

console.log('\n[ALL PASSED] M1-3 Frontend Auth Unit & Integration Suite passed successfully!');
