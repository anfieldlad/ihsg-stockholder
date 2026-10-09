export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      const targetUrl = new URL(url.pathname + url.search, 'https://ihsg.badai.tech');
      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', 'ihsg.badai.tech');
      return fetch(new Request(targetUrl.toString(), {
        method: request.method,
        headers: newHeaders,
        body: request.body,
        redirect: 'follow'
      }));
    }
    return env.ASSETS.fetch(request);
  }
};
