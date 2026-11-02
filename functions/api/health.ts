// Cloudflare Pages Function: /api/health
export async function onRequest() {
  return new Response(JSON.stringify({ status: 'ok', time: new Date().toISOString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

