import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../public/_worker.js';
import { onRequest } from '../functions/api/sheet.ts';
import { SPREADSHEET_ID, SHEETS_CONFIG } from '../src/config/sheets.ts';
import { LEARNER_SHEET_ID } from '../src/learners/data.ts';

test('Worker and Pages Function route every configured tab correctly, bypass cache and reject other sources', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => { calls.push({ url, options }); return new Response('STT,Tên đề tài\n1,A'); });
  const handlers = [(request) => worker.fetch(request, {}), (request) => onRequest({ request })];
  for (const handler of handlers) {
    for (const [dataset, workbook, gids] of [['staff', SPREADSHEET_ID, SHEETS_CONFIG.map((s) => s.gid)], ['learners', LEARNER_SHEET_ID, ['844694624', '1326842216']]]) {
      for (const gid of gids) {
        const response = await handler(new Request(`https://example.com/api/sheet?dataset=${dataset}&gid=${gid}`));
        assert.equal(response.status, 200);
        assert.ok(calls.at(-1).url.includes(`/d/${workbook}/export?format=csv&gid=${gid}`));
        assert.equal(calls.at(-1).options.cache, 'no-store');
        assert.ok(calls.at(-1).options.signal instanceof AbortSignal);
        assert.match(response.headers.get('cache-control'), /no-store/);
      }
    }
    const head = await handler(new Request('https://example.com/api/sheet?gid=1326842216', { method: 'HEAD' }));
    assert.equal(await head.text(), '');
    const before = calls.length;
    for (const query of ['gid=999', 'dataset=learners&gid=80327175', 'dataset=other&gid=844694624']) assert.equal((await handler(new Request('https://example.com/api/sheet?' + query))).status, 400);
    assert.equal((await handler(new Request('https://example.com/api/sheet?gid=1326842216', { method: 'POST' }))).status, 405);
    assert.equal(calls.length, before);
  }
});

test('Worker never serves an HTML success page as a missing JavaScript chunk', async () => {
  const env = { ASSETS: { fetch: async () => new Response('<html>SPA</html>', { headers: { 'content-type': 'text/html' } }) } };
  assert.equal((await worker.fetch(new Request('https://example.com/assets/missing.js'), env)).status, 404);
  const shell = await worker.fetch(new Request('https://example.com/projects/learners/quality'), env);
  assert.equal(shell.status, 200);
  assert.equal(shell.headers.get('cache-control'), 'no-cache');
});

test('Worker and Pages Function expose upstream timeouts as 504', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('timed out', 'TimeoutError'); });
  const request = new Request('https://example.com/api/sheet?gid=1326842216');
  assert.equal((await worker.fetch(request, {})).status, 504);
  assert.equal((await onRequest({ request })).status, 504);
});
