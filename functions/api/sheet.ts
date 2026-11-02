// Cloudflare Pages Function: /api/sheet
export async function onRequest(context: any) {
  const url = new URL(context.request.url);
  if (!['GET', 'HEAD'].includes(context.request.method)) return new Response('Method not allowed', { status: 405 });
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
    return new Response(context.request.method === 'HEAD' ? null : body, {
      status: googleRes.status,
      headers,
    });
  } catch (err: any) {
    return new Response(`Proxy error: ${err?.message || err}`, { status: err?.name === 'TimeoutError' ? 504 : 502 });
  }
}

