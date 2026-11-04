import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { DEFAULT_PROJECT_FILTERS } from '../src/services/projectTable.ts';
import { getProjectRole, canAccessProjectView, resolveProjectAccessRoute } from '../src/services/projectAccess.ts';
import { projectViews, publicationViews, resolveRouteLocation, routePath } from '../src/routing.ts';
import { learnerViews } from '../src/learners/data.ts';

test('guests and regular accounts share view 1; only authenticated administrators get view 2', () => {
  for (const auth of [{}, { isAuthenticated: false }, { isAuthenticated: true }, { isAuthenticated: false, isSuperAdmin: true }]) {
    assert.equal(getProjectRole(auth), 'user');
  }
  assert.equal(getProjectRole({ isAuthenticated: true, isSuperAdmin: true }), 'admin');
  assert.equal(getProjectRole({ isAuthenticated: true, isDelegated: true }), 'admin');
});

test('view 1 allows exactly the requested staff and learner pages, including direct and legacy URLs', () => {
  const allowed = { projects: ['overview', 'people', 'projects'], learners: ['overview', 'projects', 'people'] };
  for (const [area, views] of [['projects', projectViews], ['learners', learnerViews]]) {
    for (const view of views) {
      const route = { area, view };
      const expected = allowed[area].includes(view) ? route : { area, view: 'overview' };
      assert.equal(canAccessProjectView('user', area, view), allowed[area].includes(view));
      for (const location of [
        { pathname: routePath(route), hash: '', search: '' },
        { pathname: '/', hash: '#' + routePath(route), search: '' },
      ]) {
        const requested = resolveRouteLocation(location).route;
        assert.deepEqual(resolveProjectAccessRoute(requested, 'user'), expected);
        assert.deepEqual(resolveProjectAccessRoute(requested, 'admin'), route);
        assert.deepEqual(resolveProjectAccessRoute(resolveProjectAccessRoute(requested, 'admin'), 'user'), expected);
      }
    }
    assert.equal(canAccessProjectView('admin', area, 'invalid-view'), false);
  }
});

test('KHCN access leaves every publication route untouched for both roles', () => {
  for (const view of publicationViews) {
    const route = { area: 'publications', view };
    for (const role of ['user', 'admin']) assert.equal(resolveProjectAccessRoute(route, role), route);
  }
});

const vite = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom' });
after(() => vite.close());
const { Sidebar } = await vite.ssrLoadModule('/src/components/common/Sidebar.tsx');
const { ProjectsTableView } = await vite.ssrLoadModule('/src/components/views/ProjectsTableView.tsx');
const { ProjectDrawer } = await vite.ssrLoadModule('/src/components/common/ProjectDrawer.tsx');
const { FilterBar } = await vite.ssrLoadModule('/src/components/common/FilterBar.tsx');
const { useDashboard } = await vite.ssrLoadModule('/src/store/useDashboardStore.ts');
const { default: App } = await vite.ssrLoadModule('/src/App.tsx');
const { AuthProvider } = await vite.ssrLoadModule('/src/nckh/context/AuthContext.jsx');

test('view 1 ignores saved admin filters immediately and preserves the admin selection', () => {
  let store;
  function Probe({ allowFilters }) { store = useDashboard({ allowFilters }); return null; }
  const render = (allowFilters) => renderToStaticMarkup(createElement(Probe, { allowFilters }));
  render(true);
  try {
    store.updateFilters({ year: 2026, unit: 'Khoa Y', searchQuery: 'Đề tài đã lọc', onlyExtended: true });
    render(false);
    assert.deepEqual(store.filters, DEFAULT_PROJECT_FILTERS);
    render(true);
    assert.equal(store.filters.year, 2026);
    assert.equal(store.filters.unit, 'Khoa Y');
    assert.equal(store.filters.searchQuery, 'Đề tài đã lọc');
    assert.equal(store.filters.onlyExtended, true);
  } finally { store.resetFilters(); }
});

test('staff filter bar is absent on all view 1 pages and unchanged for authenticated admins', () => {
  const saved = Object.fromEntries(['window', 'localStorage'].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const whitelist = JSON.parse(readFileSync(new URL('../src/nckh/data/whitelist.json', import.meta.url), 'utf8'));
  const storage = new Map();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key),
  } });
  try {
    for (const email of [null, 'user@example.com', whitelist.superAdmin]) {
      storage.clear();
      if (email) storage.set('ctump_auth_user', JSON.stringify({ email, name: 'Tài khoản kiểm tra', isGuest: false }));
      for (const view of ['overview', 'people', 'projects']) {
        Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { pathname: `/projects/staff/${view}`, hash: '', search: '' } } });
        const html = renderToStaticMarkup(createElement(AuthProvider, null, createElement(App)));
        assert.equal(html.includes('staff-filter-bar'), email === whitelist.superAdmin, `${email ?? 'guest'} / ${view}`);
      }
    }
  } finally {
    for (const key of ['window', 'localStorage']) {
      if (saved[key]) Object.defineProperty(globalThis, key, saved[key]);
      else delete globalThis[key];
    }
  }
});

test('rendered menus contain three entries for users and all existing entries for admins', () => {
  for (const area of ['projects', 'learners']) {
    const props = { area, projectView: 'overview', learnerView: 'overview', publicationView: 'all', isOpen: false };
    const user = renderToStaticMarkup(createElement(Sidebar, { ...props, projectRole: 'user' }));
    const admin = renderToStaticMarkup(createElement(Sidebar, { ...props, projectRole: 'admin' }));
    assert.equal((user.match(/class="nav-label"/g) || []).length, 3);
    assert.equal((admin.match(/class="nav-label"/g) || []).length, area === 'projects' ? 7 : 6);
    assert.doesNotMatch(user, /class="nav-label">Tiến độ|class="nav-label">Kinh phí|class="nav-label">Chất lượng/);
  }
});

test('catalog columns and filters render the three restricted fields only for admins', () => {
  const user = renderToStaticMarkup(createElement(ProjectsTableView, { isAdmin: false }));
  const admin = renderToStaticMarkup(createElement(ProjectsTableView, { isAdmin: true }));
  for (const label of ['Kinh phí (tr.đ)', 'Trạng thái', 'Xếp loại']) {
    assert.equal(user.includes(label), false);
    assert.equal(admin.includes(label), true);
  }
  const adminFilters = renderToStaticMarkup(createElement(FilterBar));
  for (const field of ['staff-filter-year', 'staff-filter-unit', 'staff-filter-status', 'staff-filter-grade']) {
    assert.equal(adminFilters.includes(field), true);
  }
});

test('catalog detail hides budget, status and grade while the original admin detail remains available', () => {
  const project = {
    title: 'Đề tài kiểm tra', level: 'TRUONG', stt: 1, status: 'DA_NGHIEM_THU', grade: 'TOT',
    budget: 42, budgetKnown: true, isAccepted: true, members: [], pi: { name: 'Nguyễn An' },
  };
  const user = renderToStaticMarkup(createElement(ProjectDrawer, { project, hideCatalogFields: true }));
  const admin = renderToStaticMarkup(createElement(ProjectDrawer, { project }));
  for (const label of ['Kinh phí đề tài:', 'Trạng thái nghiệm thu:', 'Xếp loại đề tài:', 'drawer-status-badge']) {
    assert.equal(user.includes(label), false);
    assert.equal(admin.includes(label), true);
  }
});
