// Cloudflare Worker / Pages worker entrypoint
// Proxies /api/sheet directly to Google Sheets CSV export from Cloudflare Edge
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/sheet') {
      const gid = url.searchParams.get('gid');
      if (!gid) {
        return new Response('Missing gid parameter', { status: 400 });
      }

      const SPREADSHEET_ID = '1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg';
      const targetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;

      try {
        const googleRes = await fetch(targetUrl);
        const headers = new Headers(googleRes.headers);
        headers.set('Content-Type', 'text/csv; charset=utf-8');
        headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(googleRes.body, {
          status: googleRes.status,
          headers,
        });
      } catch (err) {
        return new Response(`Proxy error: ${err.message}`, { status: 502 });
      }
    }

    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pass through to static assets
    if (env && env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};

