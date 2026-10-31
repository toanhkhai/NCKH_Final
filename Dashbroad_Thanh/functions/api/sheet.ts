// Cloudflare Pages Function: /api/sheet
export async function onRequest(context: any) {
  const url = new URL(context.request.url);
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
  } catch (err: any) {
    return new Response(`Proxy error: ${err?.message || err}`, { status: 502 });
  }
}

