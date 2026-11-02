import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoutePath, resolveRouteLocation, routePath, projectViews, publicationViews } from '../src/routing.ts';
import { learnerViews } from '../src/learners/data.ts';
import worker from '../public/_worker.js';

test('all dashboard routes round-trip through clean paths', () => {
  const routes = [
    ...projectViews.map((view) => ({ area: 'projects', view })),
    ...learnerViews.map((view) => ({ area: 'learners', view })),
    ...publicationViews.map((view) => ({ area: 'publications', view })),
  ];
  for (const route of routes) {
    const path = routePath(route);
    assert.equal(path.includes('#'), false);
    assert.deepEqual(parseRoutePath(path), route);
    assert.deepEqual(resolveRouteLocation({ pathname: path, hash: '', search: '' }), { route, replaceUrl: null });
    assert.deepEqual(resolveRouteLocation({ pathname: '/', hash: '#' + path, search: '?test=1' }), { route, replaceUrl: path + '?test=1' });
  }
});

test('legacy staff URLs and trailing slashes normalize without dropping query strings', () => {
  const route = { area: 'projects', view: 'people' };
  for (const location of [
    { pathname: '/', hash: '#/projects/people', search: '?from=bookmark' },
    { pathname: '/projects/people/', hash: '', search: '?from=bookmark' },
    { pathname: '/projects/staff/people/', hash: '', search: '?from=bookmark' },
  ]) assert.deepEqual(resolveRouteLocation(location), { route, replaceUrl: '/projects/staff/people?from=bookmark' });
});

test('ordinary fragments are preserved, APIs and unknown views are not parsed as dashboards', () => {
  assert.equal(resolveRouteLocation({ pathname: '/publications/lookup', hash: '#top', search: '' }).replaceUrl, null);
  assert.equal(parseRoutePath('/api/sheet'), null);
  assert.equal(parseRoutePath('/projects/staff/nonexistent'), null);
  assert.equal(parseRoutePath('/projects/learners/nonexistent'), null);
  assert.deepEqual(resolveRouteLocation({ pathname: '/', hash: '', search: '' }).route, { area: 'projects', view: 'overview' });
});

test('Cloudflare serves the SPA shell for direct dashboard requests and HEAD reloads', async () => {
  for (const path of ['/projects/staff/projects', '/projects/learners/people', '/publications/lookup', '/projects/overview/']) {
    for (const method of ['GET', 'HEAD']) {
      let forwarded;
      const response = await worker.fetch(new Request(`https://example.com${path}?test=1`, { method }), {
        ASSETS: { fetch: async (request) => { forwarded = request; return new Response('<html>SPA shell</html>'); } },
      });
      assert.equal(response.status, 200);
      assert.equal(new URL(forwarded.url).pathname, '/');
      assert.equal(new URL(forwarded.url).search, '?test=1');
      assert.equal(forwarded.method, method);
    }
  }
});

test('Cloudflare API and assets keep their response types and are not rewritten to the dashboard', async () => {
  const paths = [];
  const env = { ASSETS: { fetch: async (request) => { paths.push(new URL(request.url).pathname); return new Response('asset', { headers: { 'content-type': 'application/javascript' } }); } } };
  const health = await worker.fetch(new Request('https://example.com/api/health'), env);
  assert.equal((await health.json()).status, 'ok');
  const invalidSheet = await worker.fetch(new Request('https://example.com/api/sheet?dataset=learners&gid=999'), env);
  assert.equal(invalidSheet.status, 400);
  for (const path of ['/assets/index.js', '/logo.png']) {
    const response = await worker.fetch(new Request('https://example.com' + path), env);
    assert.equal(response.headers.get('content-type'), 'application/javascript');
    assert.equal(paths.at(-1), path);
  }
  assert.equal((await worker.fetch(new Request('https://example.com/api/unknown'), env)).status, 404);
  assert.deepEqual(paths, ['/assets/index.js', '/logo.png']);
});
