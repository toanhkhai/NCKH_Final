// Cloudflare Worker / Pages worker entrypoint
// Proxies /api/sheet directly to Google Sheets CSV export from Cloudflare Edge
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });

    if (url.pathname === '/api/sheet') {
      const gid = url.searchParams.get('gid');
      if (!gid) {
        return new Response('Missing gid parameter', { status: 400 });
      }

      const dataset = url.searchParams.get('dataset') || 'staff';
      if (!['staff', 'learners'].includes(dataset) || (dataset === 'staff' && !['844694624', '1326842216', '80327175', '1053013808', '660559511', '603726587'].includes(gid)) || (dataset === 'learners' && !['844694624', '1326842216'].includes(gid))) return new Response('Unknown sheet dataset', { status: 400 });
      const SPREADSHEET_ID = dataset === 'learners' ? '1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02' : '1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg';
      const targetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;

      try {
        const googleRes = await fetch(targetUrl, { signal: AbortSignal.timeout(20000), cache: 'no-store' });
        const headers = new Headers(googleRes.headers);
        headers.set('Content-Type', 'text/csv; charset=utf-8');
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        headers.set('Access-Control-Allow-Origin', '*');

        const body = await googleRes.arrayBuffer();
        return new Response(request.method === 'HEAD' ? null : body, {
          status: googleRes.status,
          headers,
        });
      } catch (err) {
        return new Response(`Proxy error: ${err.message}`, { status: err.name === 'TimeoutError' ? 504 : 502 });
      }
    }

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_api/')) return new Response('Unknown API', { status: 404 });

    // UI routes use History API URLs. Serve the SPA shell for direct requests/reloads.
    // API endpoints and asset URLs retain their own handling.
    if (env && env.ASSETS) {
      if ((request.method === 'GET' || request.method === 'HEAD') && /^\/(?:projects|publications)\/[a-z0-9/-]+\/?$/.test(url.pathname)) {
        const shellUrl = new URL(request.url);
        shellUrl.pathname = '/';
        const shell = await env.ASSETS.fetch(new Request(shellUrl, request));
        const headers = new Headers(shell.headers);
        headers.set('Cache-Control', 'no-cache');
        return new Response(request.method === 'HEAD' ? null : shell.body, { status: shell.status, headers });
      }
      const asset = await env.ASSETS.fetch(request);
      if ((url.pathname.startsWith('/assets/') || /\.[a-z0-9]+$/i.test(url.pathname) && !/\.html$/i.test(url.pathname)) && asset.headers.get('Content-Type')?.includes('text/html')) return new Response('Asset not found', { status: 404 });
      return asset;
    }

    return new Response('Not found', { status: 404 });
  },
};

