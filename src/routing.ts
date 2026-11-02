import type { DashboardView } from './store/useDashboardStore';
import type { PublicationView } from './components/common/Sidebar';
import { learnerViews, type LearnerView } from './learners/data.ts';

export type Area = 'projects' | 'learners' | 'publications';
export type Route = { area: 'projects'; view: DashboardView } | { area: 'learners'; view: LearnerView } | { area: 'publications'; view: PublicationView };
export const projectViews: DashboardView[] = ['overview', 'units', 'progress', 'people', 'finance', 'projects', 'data-quality'];
export const publicationViews: PublicationView[] = ['all', 'source1', 'source2', 'lookup'];
const defaultRoute: Route = { area: 'projects', view: 'overview' };

export function parseRoutePath(pathname: string): Route | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return defaultRoute;
  const [, group, nestedView] = path.match(/^\/projects\/(staff|learners)\/([a-z0-9-]+)$/) || [];
  if (group === 'learners' && learnerViews.includes(nestedView as LearnerView)) return { area: 'learners', view: nestedView as LearnerView };
  if (group === 'staff' && projectViews.includes(nestedView as DashboardView)) return { area: 'projects', view: nestedView as DashboardView };
  const [, area, view] = path.match(/^\/(projects|publications)\/([a-z0-9-]+)$/) || [];
  if (area === 'publications' && publicationViews.includes(view as PublicationView)) return { area, view: view as PublicationView };
  if (area === 'projects' && projectViews.includes(view as DashboardView)) return { area, view: view as DashboardView };
  return null;
}

export function routePath(route: Route): string {
  return route.area === 'publications' ? `/publications/${route.view}` : `/projects/${route.area === 'learners' ? 'learners' : 'staff'}/${route.view}`;
}

export function resolveRouteLocation(location: { pathname: string; hash: string; search: string }) {
  const legacy = location.hash.startsWith('#/') ? parseRoutePath(location.hash.slice(1)) : null;
  const pathRoute = parseRoutePath(location.pathname);
  const route = legacy ?? pathRoute ?? defaultRoute;
  const canonical = routePath(route);
  // Convert old bookmarks in place, without an extra history entry. Normal anchors remain valid.
  const replaceUrl = legacy ? canonical + location.search
    : pathRoute && location.pathname !== '/' && location.pathname !== canonical
      ? canonical + location.search + location.hash : null;
  return { route, replaceUrl };
}
