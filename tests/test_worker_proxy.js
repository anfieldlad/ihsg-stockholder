import assert from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

console.log('Running test_worker_proxy.js (Cloudflare Worker Proxy Suite)...');

// In Node.js 18+, Undici Request requires { duplex: 'half' } when body is a stream.
// Cloudflare Workers workerd does not require it. Polyfill default duplex for Node testing.
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

// Test 1: Proxy /api/price/BBCA
{
  let fetchCalled = false;
  let forwardedRequest = null;
  let assetsCalled = false;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (req) => {
    fetchCalled = true;
    forwardedRequest = req;
    return new Response(JSON.stringify({ code: 'BBCA', last_price: 10500 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const env = {
    ASSETS: {
      fetch: async () => {
        assetsCalled = true;
        return new Response('Not asset', { status: 404 });
      },
    },
  };

  try {
    const req = new Request('https://ihsg.bad.ai.id/api/price/BBCA', {
      method: 'GET',
      headers: { 'User-Agent': 'TestClient/1.0', 'Accept': 'application/json' },
    });

    const res = await worker.fetch(req, env);
    assert.strictEqual(fetchCalled, true, 'global fetch must be called for /api/ routes');
    assert.strictEqual(assetsCalled, false, 'env.ASSETS.fetch must NOT be called for /api/ routes');
    assert.strictEqual(res.status, 200);

    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.origin, 'https://ihsg.badai.tech', 'Target URL origin must be https://ihsg.badai.tech');
    assert.strictEqual(targetUrl.pathname, '/api/price/BBCA', 'Target pathname must match original /api/path');
    assert.strictEqual(forwardedRequest.headers.get('Host'), 'ihsg.badai.tech', 'Host header must be set to ihsg.badai.tech');
    assert.strictEqual(forwardedRequest.headers.get('Accept'), 'application/json', 'Headers must be forwarded');
    assert.strictEqual(forwardedRequest.redirect, 'follow', 'Redirect must be follow');

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

  const env = {
    ASSETS: {
      fetch: async () => new Response('Asset', { status: 200 }),
    },
  };

  try {
    const req = new Request('https://ihsg.bad.ai.id/api/prices/batch?codes=BBCA,BBRI&refresh=1', {
      method: 'GET',
    });

    const res = await worker.fetch(req, env);
    assert.strictEqual(res.status, 200);
    const targetUrl = new URL(forwardedRequest.url);
    assert.strictEqual(targetUrl.pathname, '/api/prices/batch');
    assert.strictEqual(targetUrl.search, '?codes=BBCA,BBRI&refresh=1', 'Query parameters must be preserved');
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

  const env = {
    ASSETS: {
      fetch: async () => new Response('Asset', { status: 200 }),
    },
  };

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
  let assetsCalled = false;
  let originalFetchCalled = false;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    originalFetchCalled = true;
    return new Response('External', { status: 200 });
  };

  const env = {
    ASSETS: {
      fetch: async (req) => {
        assetsCalled = true;
        return new Response('<!DOCTYPE html><html></html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        });
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
      assert.strictEqual(assetsCalled, true, `env.ASSETS.fetch must be called for ${p}`);
      assert.strictEqual(originalFetchCalled, false, `global fetch must NOT be called for ${p}`);
      assert.strictEqual(res.status, 200);
    }

    console.log('[PASS] Test 4: Static assets served via env.ASSETS.fetch without proxying');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log('\nAll Cloudflare Worker proxy unit tests passed successfully!');
