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

// Test 1: Proxy /api/price/BBCA (Legacy behavior, flag unset)
{
  let fetchCalled = false, forwardedRequest = null, assetsCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    fetchCalled = true;
    forwardedRequest = req;
    return new Response(JSON.stringify({ code: 'BBCA', last_price: 10500 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const env = { ASSETS: { fetch: async () => { assetsCalled = true; return new Response('Not asset', { status: 404 }); } } };

  try {
    const req = new Request('https://ihsg.bad.ai.id/api/price/BBCA', {
      method: 'GET',
      headers: { 'User-Agent': 'TestClient/1.0', 'Accept': 'application/json' },
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(fetchCalled, true);
    assert.strictEqual(assetsCalled, false);
    assert.strictEqual(res.status, 200);

    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.origin, 'https://ihsg.badai.tech');
    assert.strictEqual(targetUrl.pathname, '/api/price/BBCA');
    assert.strictEqual(forwardedRequest.headers.get('Host'), 'ihsg.badai.tech');
    assert.strictEqual(forwardedRequest.headers.get('Accept'), 'application/json');
    assert.strictEqual(forwardedRequest.redirect, 'follow');
    console.log('[PASS] Test 1: /api/price/BBCA correctly proxied to https://ihsg.badai.tech');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 2: Proxy /api/prices/batch with query parameters
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response(JSON.stringify({ BBCA: 10500, BBRI: 4800 }), { status: 200 });
  };
  const env = { ASSETS: { fetch: async () => new Response('Asset', { status: 200 }) } };

  try {
    const req = new Request('https://ihsg.bad.ai.id/api/prices/batch?codes=BBCA,BBRI&refresh=1', { method: 'GET' });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);
    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.pathname, '/api/prices/batch');
    assert.strictEqual(targetUrl.search, '?codes=BBCA,BBRI&refresh=1');
    assert.strictEqual(forwardedRequest.headers.get('Host'), 'ihsg.badai.tech');
    console.log('[PASS] Test 2: /api/prices/batch?codes=... query params preserved');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// Test 3: Proxy POST /api/feedback with body
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response(JSON.stringify({ status: 'ok' }), { status: 201 });
  };
  const env = { ASSETS: { fetch: async () => new Response('Asset', { status: 200 }) } };

  try {
    const payload = JSON.stringify({ message: 'Great site!' });
    const req = new Request('https://ihsg.bad.ai.id/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(forwardedRequest.method, 'POST');
    assert.strictEqual(forwardedRequest.headers.get('Host'), 'ihsg.badai.tech');
    console.log('[PASS] Test 3: POST /api/feedback body and method forwarded');
  } finally {
    globalThis.fetch = originalFetch;
  }
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

// Test 9: Legacy endpoints never receive ORIGIN_SECRET even when env is configured
{
  let forwardedRequest = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    forwardedRequest = req;
    return new Response('{"status":"ok"}', { status: 200 });
  };
  const env = {
    V1_ORIGIN: 'https://ihsg-origin.bad.ai.id',
    ORIGIN_SECRET: 'do-not-leak-to-legacy-upstream',
  };

  try {
    const req = new Request('https://ihsg.bad.ai.id/api/price/BBCA', { method: 'GET' });
    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);
    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.origin, 'https://ihsg.badai.tech');
    assert.strictEqual(forwardedRequest.headers.get('X-Origin-Auth'), null);
    assert.strictEqual(forwardedRequest.headers.get('Host'), 'ihsg.badai.tech');
    console.log('[PASS] Test 9: Legacy endpoints never receive ORIGIN_SECRET');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('\nAll Cloudflare Worker proxy unit tests passed successfully!');
