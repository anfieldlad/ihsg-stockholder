function resolveV1Path(pathname) {
  if (pathname === '/api/v1' || pathname.startsWith('/api/v1/')) return pathname;
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const v1Path = resolveV1Path(url.pathname);

    if (v1Path !== null) {
      const v1Origin = env?.V1_ORIGIN;
      const originSecret = env?.ORIGIN_SECRET;

      if (!v1Origin || !originSecret) {
        return new Response('{"error":"unavailable"}', {
          status: 503,
          headers: {
            'content-type': 'application/json',
            'cache-control': 'no-store'
          }
        });
      }

      const targetUrl = new URL(v1Path + url.search, v1Origin);
      const newHeaders = new Headers(request.headers);
      newHeaders.delete('x-origin-auth');
      newHeaders.delete('x-client-ip');
      newHeaders.delete('x-forwarded-for');
      newHeaders.delete('x-real-ip');
      newHeaders.delete('forwarded');
      newHeaders.set('X-Origin-Auth', originSecret);
      newHeaders.set('X-Client-IP', request.headers.get('CF-Connecting-IP') ?? '');

      const originResponse = await fetch(new Request(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: 'manual'
      }));

      const responseHeaders = new Headers(originResponse.headers);
      if (!responseHeaders.has('cache-control')) {
        responseHeaders.set('cache-control', 'private, no-store');
      }

      const responseBody = (originResponse.status === 204 || originResponse.status === 304)
        ? null
        : originResponse.body;

      return new Response(responseBody, {
        status: originResponse.status,
        statusText: originResponse.statusText,
        headers: responseHeaders
      });
    }

    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return new Response('{"error":"not found"}', {
        status: 404,
        headers: {
          'content-type': 'application/json',
          'cache-control': 'no-store'
        }
      });
    }

    if (
      url.pathname === '/__/auth' ||
      url.pathname.startsWith('/__/auth/') ||
      url.pathname === '/__/firebase' ||
      url.pathname.startsWith('/__/firebase/')
    ) {
      const upstreamHost = 'ihsg-storm.firebaseapp.com';
      const targetUrl = new URL(url.pathname + url.search, `https://${upstreamHost}`);
      const newHeaders = new Headers(request.headers);
      newHeaders.delete('x-origin-auth');
      newHeaders.delete('cookie');
      newHeaders.delete('authorization');
      newHeaders.set('Host', upstreamHost);

      const upstreamResponse = await fetch(new Request(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: (request.method !== 'GET' && request.method !== 'HEAD') ? request.body : undefined,
        redirect: 'manual'
      }));

      const responseHeaders = new Headers(upstreamResponse.headers);
      responseHeaders.delete('set-cookie');
      const responseBody = (upstreamResponse.status === 204 || upstreamResponse.status === 304 || request.method === 'HEAD')
        ? null
        : upstreamResponse.body;

      return new Response(responseBody, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders
      });
    }

    return env.ASSETS.fetch(request);
  }
};
