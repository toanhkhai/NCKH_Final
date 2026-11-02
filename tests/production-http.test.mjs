import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createDashboardServer } from '../server.js';

async function fixture(t, fetcher, timeoutMs = 1000) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'nckh-http-'));
  await fs.mkdir(path.join(directory, 'assets'));
  await fs.writeFile(path.join(directory, 'index.html'), '<!doctype html><div id="root">SPA</div>');
  await fs.writeFile(path.join(directory, 'assets/app-12345678.js'), 'export default 1;');
  const server = createDashboardServer({ distDir: directory, fetcher, timeoutMs });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep + 'nckh-http-'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  return `http://127.0.0.1:${server.address().port}`;
}

test('Node production serves direct routes and HEAD while missing chunks and APIs remain real errors', async (t) => {
  const base = await fixture(t);
  for (const route of ['/projects/staff/overview', '/projects/learners/quality']) {
    const response = await fetch(base + route);
    assert.match(await response.text(), /id="root"/);
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    const head = await fetch(base + route, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), '');
  }
  const asset = await fetch(base + '/assets/app-12345678.js');
  assert.match(asset.headers.get('content-type'), /javascript/);
  assert.match(asset.headers.get('cache-control'), /immutable/);
  for (const route of ['/assets/missing.js', '/api/unknown']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /id="root"/);
  }
});

test('Node production routes same gids to the correct workbooks and allows only configured sources', async (t) => {
  const calls = [];
  const base = await fixture(t, async (url) => { calls.push(url); return new Response('STT,Tên đề tài\n1,A'); });
  const staff = await fetch(base + '/api/sheet?gid=1326842216');
  assert.equal(staff.status, 200);
  assert.match(calls.at(-1), /1NpS0QE4tY0xPxkhQxZimyXwGk0R4a5bg/);
  const learner = await fetch(base + '/api/sheet?dataset=learners&gid=1326842216');
  assert.equal(learner.status, 200);
  assert.match(calls.at(-1), /1C6OhjeY0QCMsQnHaQUz7_Hg-I5jnYx02/);
  assert.equal(learner.headers.get('cache-control'), 'no-store');
  for (const query of ['gid=999', 'dataset=learners&gid=80327175', 'dataset=other&gid=1326842216']) {
    assert.equal((await fetch(base + '/api/sheet?' + query)).status, 400);
  }
  assert.equal(calls.length, 2);
});

test('Node production returns a bounded 504 for a stalled Sheets request', async (t) => {
  const base = await fixture(t, (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true })), 10);
  assert.equal((await fetch(base + '/api/sheet?gid=1326842216')).status, 504);
});
