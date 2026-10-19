import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_worker_proxy.js (Cloudflare Worker Proxy Suite)...');

// Polyfill duplex for Node testing of Request streams
const OriginalRequest = globalThis.Request;
globalThis.Request = class extends OriginalRequest {
  constructor(input, init) {
    if (init && init.body && !init.duplex) {
      init = { ...init, duplex: 'half' };
    }
    super(input, init);
  }
};

const workerPath = path.resolve(process.cwd(), 'worker.js');
const workerUrl = pathToFileURL(workerPath).href;
const module = await import(workerUrl);
const worker = module.default;

assert(worker && typeof worker.fetch === 'function', 'worker.js must export default with a fetch function');

// Shared helper: env configured for the V1 origin
const V1_ENV = () => ({
  V1_ORIGIN: 'https://ihsg-origin.bad.ai.id',
  ORIGIN_SECRET: 'test-secret-origin',
  ASSETS: { fetch: async () => new Response('Asset', { status: 500 }) },
});

// Test 1: Legacy paths (/api/prices, /api/price/BBCA, /api/feedback/status, /api/feedback) return 404 JSON
{
  let fetchCalled = false, assetsCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalled = true; return new Response('x'); };
  const env = {
    ...V1_ENV(),
    ASSETS: { fetch: async () => { assetsCalled = true; return new Response('a'); } },
  };
  try {
    const legacyRequests = [
      new Request('https://ihsg.bad.ai.id/api/prices', { method: 'GET' }),
      new Request('https://ihsg.bad.ai.id/api/prices?codes=BBCA,BBRI', { method: 'GET' }),
      new Request('https://ihsg.bad.ai.id/api/price/BBCA', { method: 'GET' }),
      new Request('https://ihsg.bad.ai.id/api/feedback/status', { method: 'GET' }),
      new Request('https://ihsg.bad.ai.id/api/feedback', { method: 'GET' }),
      new Request('https://ihsg.bad.ai.id/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Legacy feedback test' }),
      }),
    ];
    for (const req of legacyRequests) {
      const res = await worker.fetch(req, env);
      assert.strictEqual(res.status, 404, req.url);
      assert.strictEqual(res.headers.get('content-type'), 'application/json', req.url);
      assert.strictEqual(res.headers.get('cache-control'), 'no-store', req.url);
      assert.deepStrictEqual(await res.json(), { error: 'not found' }, req.url);
    }
    assert.strictEqual(fetchCalled, false);
    assert.strictEqual(assetsCalled, false);
    console.log('[PASS] Test 1: legacy paths return 404 JSON without upstream fetch');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 2: /api/v1/prices and /api/v1/feedback paths proxy to V1_ORIGIN
{
  const forwardedRequests = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequests.push(req);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    // 2a: /api/v1/prices with query string
    const req1 = new Request('https://ihsg.bad.ai.id/api/v1/prices?codes=BBCA,BBRI', { method: 'GET' });
    const res1 = await worker.fetch(req1, V1_ENV());
    assert.strictEqual(res1.status, 200);
    const target1 = new URL(forwardedRequests[0].url);
    assert.strictEqual(target1.origin, 'https://ihsg-origin.bad.ai.id');
    assert.strictEqual(target1.pathname, '/api/v1/prices');
    assert.strictEqual(target1.search, '?codes=BBCA,BBRI');

    // 2b: /api/v1/prices/BBCA
    const req2 = new Request('https://ihsg.bad.ai.id/api/v1/prices/BBCA', { method: 'GET' });
    const res2 = await worker.fetch(req2, V1_ENV());
    assert.strictEqual(res2.status, 200);
    const target2 = new URL(forwardedRequests[1].url);
    assert.strictEqual(target2.origin, 'https://ihsg-origin.bad.ai.id');
    assert.strictEqual(target2.pathname, '/api/v1/prices/BBCA');

    // 2c: /api/v1/feedback/status
    const req3 = new Request('https://ihsg.bad.ai.id/api/v1/feedback/status', { method: 'GET' });
    const res3 = await worker.fetch(req3, V1_ENV());
    assert.strictEqual(res3.status, 200);
    const target3 = new URL(forwardedRequests[2].url);
    assert.strictEqual(target3.pathname, '/api/v1/feedback/status');

    // 2d: /api/v1/feedback (POST)
    const payload = JSON.stringify({ description: 'Great site!' });
    const req4 = new Request('https://ihsg.bad.ai.id/api/v1/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    const res4 = await worker.fetch(req4, V1_ENV());
    assert.strictEqual(res4.status, 200);
    const target4 = new URL(forwardedRequests[3].url);
    assert.strictEqual(target4.pathname, '/api/v1/feedback');
    assert.strictEqual(forwardedRequests[3].method, 'POST');
    assert.strictEqual(await forwardedRequests[3].text(), payload);

    console.log('[PASS] Test 2: /api/v1/prices and /api/v1/feedback paths proxy to V1_ORIGIN');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 3c: Unknown /api/* returns 404 JSON with no upstream fetch
{
  let fetchCalled = false, assetsCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalled = true; return new Response('x'); };
  const env = {
    ...V1_ENV(),
    ASSETS: { fetch: async () => { assetsCalled = true; return new Response('a'); } },
  };
  try {
    const paths = ['/api', '/api/', '/api/x', '/api/health', '/api/prices/batch', '/api/prices_fake',
      '/api/price/', '/api/price/BB/CA', '/api/price/B.CA', '/api/feedback/other', '/api/constructor'];
    for (const p of paths) {
      const res = await worker.fetch(new Request(`https://ihsg.bad.ai.id${p}`), env);
      assert.strictEqual(res.status, 404, p);
      assert.strictEqual(res.headers.get('content-type'), 'application/json', p);
      assert.deepStrictEqual(await res.json(), { error: 'not found' }, p);
    }
    assert.strictEqual(fetchCalled, false);
    assert.strictEqual(assetsCalled, false);
    console.log('[PASS] Test 3c: unknown /api/* returns 404 JSON without any fetch');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 3d: worker.js has no external fallback host and no legacy aliases
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(workerPath, 'utf8');
  assert(!src.includes('badai.tech'), 'worker.js must not reference badai.tech');
  assert(!src.includes('LEGACY_ALIASES'), 'worker.js must not contain LEGACY_ALIASES');
  console.log('[PASS] Test 3d: worker.js contains no badai.tech reference or LEGACY_ALIASES');
}

// Test 4: Static assets serve from env.ASSETS.fetch
{
  let assetsCalled = false, originalFetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    originalFetchCalled = true;
    return new Response('External', { status: 200 });
  };
  const env = {
    ASSETS: {
      fetch: async () => {
        assetsCalled = true;
        return new Response('<!DOCTYPE html><html></html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
      },
    },
  };

  try {
    const staticPaths = ['/', '/index.html', '/shareholder_data.json', '/assets/app.js', '/favicon.ico'];
    for (const p of staticPaths) {
      assetsCalled = false;
      originalFetchCalled = false;
      const req = new Request(`https://ihsg.bad.ai.id${p}`, { method: 'GET' });
      const res = await worker.fetch(req, env);
      assert.strictEqual(assetsCalled, true);
      assert.strictEqual(originalFetchCalled, false);
      assert.strictEqual(res.status, 200);
    }
    console.log('[PASS] Test 4: Static assets served via env.ASSETS.fetch without proxying');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 5: V1 route returns 503 unavailable when V1_ORIGIN or ORIGIN_SECRET is empty/unset
{
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { fetchCalled = true; return new Response('OK', { status: 200 }); };

  try {
    const testEnvs = [
      {},
      { V1_ORIGIN: '' },
      { V1_ORIGIN: 'https://ihsg-origin.bad.ai.id' },
      { ORIGIN_SECRET: 'supersecret' },
      { V1_ORIGIN: '', ORIGIN_SECRET: 'supersecret' },
    ];
    for (const env of testEnvs) {
      fetchCalled = false;
      const req = new Request('https://ihsg.bad.ai.id/api/v1/me', { method: 'GET' });
      const res = await worker.fetch(req, env);
      assert.strictEqual(fetchCalled, false);
      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.headers.get('content-type'), 'application/json');
      assert.strictEqual(res.headers.get('cache-control'), 'no-store');
      const body = await res.json();
      assert.deepStrictEqual(body, { error: 'unavailable' });
    }
    console.log('[PASS] Test 5: /api/v1/* returns 503 unavailable when V1_ORIGIN or ORIGIN_SECRET unset');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 6: V1 route proxies to origin when configured (headers, secret, client-ip, cache-control)
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response(JSON.stringify({ user: 'bobby' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const env = {
    V1_ORIGIN: 'https://ihsg-origin.bad.ai.id',
    ORIGIN_SECRET: 'test-secret-origin-auth-48-chars-random-hex-value-12345',
  };

  try {
    const req = new Request('https://ihsg.bad.ai.id/api/v1/me?detail=true', {
      method: 'GET',
      headers: { 'Accept': 'application/json', 'CF-Connecting-IP': '203.0.113.195' },
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);

    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.origin, 'https://ihsg-origin.bad.ai.id');
    assert.strictEqual(targetUrl.pathname, '/api/v1/me');
    assert.strictEqual(targetUrl.search, '?detail=true');
    assert.strictEqual(forwardedRequest.method, 'GET');
    assert.strictEqual(forwardedRequest.redirect, 'manual');
    assert.strictEqual(forwardedRequest.headers.get('X-Origin-Auth'), env.ORIGIN_SECRET);
    assert.strictEqual(forwardedRequest.headers.get('X-Client-IP'), '203.0.113.195');
    assert.strictEqual(res.headers.get('cache-control'), 'private, no-store');
    console.log('[PASS] Test 6: /api/v1/me routed to VPS origin with X-Origin-Auth, X-Client-IP, and private cache-control');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 7: Strips client-supplied X-Origin-Auth, X-Client-IP, X-Forwarded-For, X-Real-IP, and Forwarded
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response('{"ok":true}', { status: 200 });
  };
  const env = {
    V1_ORIGIN: 'https://ihsg-origin.bad.ai.id',
    ORIGIN_SECRET: 'legit-secret-key-abcdef',
  };

  try {
    const req = new Request('https://ihsg.bad.ai.id/api/v1/resource', {
      method: 'GET',
      headers: {
        'X-Origin-Auth': 'spoofed-attacker-secret',
        'x-client-ip': '1.2.3.4',
        'X-Forwarded-For': '198.51.100.1',
        'X-Real-IP': '198.51.100.2',
        'Forwarded': 'for=198.51.100.3',
        'CF-Connecting-IP': '198.51.100.99',
      },
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(forwardedRequest.headers.get('X-Origin-Auth'), 'legit-secret-key-abcdef');
    assert.strictEqual(forwardedRequest.headers.get('X-Client-IP'), '198.51.100.99');
    assert.strictEqual(forwardedRequest.headers.get('X-Forwarded-For'), null);
    assert.strictEqual(forwardedRequest.headers.get('X-Real-IP'), null);
    assert.strictEqual(forwardedRequest.headers.get('Forwarded'), null);
    console.log('[PASS] Test 7: Client-supplied X-Origin-Auth, X-Client-IP, X-Forwarded-For, X-Real-IP, and Forwarded stripped');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 8: Webhook path forwarded verbatim with POST body
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
  };
  const env = {
    V1_ORIGIN: 'https://ihsg-origin.bad.ai.id',
    ORIGIN_SECRET: 'webhook-origin-secret-token',
  };

  try {
    const webhookPath = '/api/v1/billing/webhooks/mayar/webhook_secret_xyz123';
    const payload = JSON.stringify({ event: 'payment.success', id: 'pay_001' });
    const req = new Request(`https://ihsg.bad.ai.id${webhookPath}?retry=0`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '103.179.56.1' },
      body: payload,
    });

    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('cache-control'), 'no-cache');

    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.origin, 'https://ihsg-origin.bad.ai.id');
    assert.strictEqual(targetUrl.pathname, webhookPath);
    assert.strictEqual(targetUrl.search, '?retry=0');
    assert.strictEqual(forwardedRequest.method, 'POST');
    assert.strictEqual(forwardedRequest.headers.get('X-Origin-Auth'), env.ORIGIN_SECRET);
    assert.strictEqual(forwardedRequest.headers.get('X-Client-IP'), '103.179.56.1');
    console.log('[PASS] Test 8: Webhook path and payload forwarded verbatim to origin');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 9: Spoofed X-Origin-Auth on a v1 path is replaced with the real secret
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response('{"status":"ok"}', { status: 200 });
  };
  try {
    const req = new Request('https://ihsg.bad.ai.id/api/v1/prices/BBCA', {
      method: 'GET',
      headers: { 'X-Origin-Auth': 'spoofed', 'X-Forwarded-For': '1.2.3.4' },
    });
    const res = await worker.fetch(req, V1_ENV());
    assert.strictEqual(res.status, 200);
    assert.strictEqual(forwardedRequest.headers.get('X-Origin-Auth'), 'test-secret-origin');
    assert.strictEqual(forwardedRequest.headers.get('X-Forwarded-For'), null);
    console.log('[PASS] Test 9: spoofed headers on v1 path are sanitized');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 10: Proxy GET /__/auth/handler to Firebase with upstream headers and no injected CSP
{
  let forwardedRequest = null;
  let assetsCalled = false;
  const originalFetch = globalThis.fetch;
  const mockHtml = '<!DOCTYPE html><html><head><title>Auth Handler</title></head><body></body></html>';

  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response(mockHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'max-age=1800',
        'X-Firebase-Auth': 'true',
      },
    });
  };
  const env = {
    ASSETS: {
      fetch: async () => {
        assetsCalled = true;
        return new Response('Asset fallback', { status: 500 });
      },
    },
  };

  try {
    const req = new Request('https://ihsg.bad.ai.id/__/auth/handler?apiKey=test-key&appName=%5BDEFAULT%5D', {
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const res = await worker.fetch(req, env);

    assert.strictEqual(assetsCalled, false, 'Assets fetch must not be called for /__/auth/handler');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.strictEqual(res.headers.get('cache-control'), 'max-age=1800');
    assert.strictEqual(res.headers.get('x-firebase-auth'), 'true');
    assert.strictEqual(res.headers.get('content-security-policy'), null, 'Worker must not inject custom CSP into Firebase auth responses');

    const bodyText = await res.text();
    assert.strictEqual(bodyText, mockHtml);

    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.origin, 'https://ihsg-storm.firebaseapp.com');
    assert.strictEqual(targetUrl.pathname, '/__/auth/handler');
    assert.strictEqual(targetUrl.search, '?apiKey=test-key&appName=%5BDEFAULT%5D');
    assert.strictEqual(forwardedRequest.headers.get('Host'), 'ihsg-storm.firebaseapp.com');
    assert.strictEqual(forwardedRequest.method, 'GET');
    console.log('[PASS] Test 10: GET /__/auth/handler correctly proxied to https://ihsg-storm.firebaseapp.com');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 11: Proxy POST /__/auth/handler with body and headers
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  const postPayload = 'state=auth-state-123&code=oauth-code-456';

  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response('{"status":"handled"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const env = { ASSETS: { fetch: async () => new Response('Asset', { status: 500 }) } };

  try {
    const req = new Request('https://ihsg.bad.ai.id/__/auth/handler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Origin-Auth': 'malicious-attempt',
      },
      body: postPayload,
    });
    const res = await worker.fetch(req, env);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(forwardedRequest.method, 'POST');
    const forwardedBody = await forwardedRequest.text();
    assert.strictEqual(forwardedBody, postPayload);

    // Toby security check: X-Origin-Auth must be stripped before forwarding to Firebase
    assert.strictEqual(forwardedRequest.headers.get('X-Origin-Auth'), null);
    assert.strictEqual(forwardedRequest.headers.get('Host'), 'ihsg-storm.firebaseapp.com');
    console.log('[PASS] Test 11: POST /__/auth/handler body forwarded and X-Origin-Auth stripped');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 12: Proxy /__/firebase/init.js route
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response('/* firebase init */', {
      status: 200,
      headers: { 'Content-Type': 'application/javascript' },
    });
  };
  const env = { ASSETS: { fetch: async () => new Response('Asset', { status: 500 }) } };

  try {
    const req = new Request('https://ihsg.bad.ai.id/__/firebase/init.js', { method: 'GET' });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);

    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.origin, 'https://ihsg-storm.firebaseapp.com');
    assert.strictEqual(targetUrl.pathname, '/__/firebase/init.js');
    console.log('[PASS] Test 12: GET /__/firebase/init.js proxied to Firebase upstream');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 13: Toby L1 - cookie and authorization stripped from request to Firebase
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response('ok', { status: 200 });
  };
  try {
    for (const p of ['/__/auth/handler', '/__/firebase/init.js']) {
      const req = new Request(`https://ihsg.bad.ai.id${p}`, {
        method: 'GET',
        headers: { Cookie: 'session=abc', Authorization: 'Bearer tok', 'User-Agent': 'x' },
      });
      const res = await worker.fetch(req, V1_ENV());
      assert.strictEqual(res.status, 200);
      assert.strictEqual(forwardedRequest.headers.get('cookie'), null);
      assert.strictEqual(forwardedRequest.headers.get('authorization'), null);
      assert.strictEqual(forwardedRequest.headers.get('user-agent'), 'x');
    }
    console.log('[PASS] Test 13: cookie and authorization stripped on /__/ proxy request');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 14: Toby L2 - Set-Cookie removed from proxied Firebase response
{
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    const h = new Headers({ 'Content-Type': 'text/html' });
    h.append('Set-Cookie', 'a=1; Path=/');
    h.append('Set-Cookie', 'b=2; Path=/');
    return new Response('ok', { status: 200, headers: h });
  };
  try {
    const res = await worker.fetch(new Request('https://ihsg.bad.ai.id/__/auth/handler'), V1_ENV());
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('set-cookie'), null);
    assert.strictEqual(res.headers.get('content-type'), 'text/html');
    console.log('[PASS] Test 14: set-cookie removed from /__/ proxy response');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('\nAll Cloudflare Worker proxy unit tests passed successfully!');
