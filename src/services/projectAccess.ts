import { projectViews, type Route } from '../routing.ts';
import { learnerViews } from '../learners/data.ts';

export type ProjectRole = 'user' | 'admin';
export type ProjectAuth = { isAuthenticated?: boolean; isSuperAdmin?: boolean; isDelegated?: boolean };
export const USER_STAFF_VIEWS = ['overview', 'people', 'projects'] as const;
export const USER_LEARNER_VIEWS = ['overview', 'projects', 'people'] as const;

export function getProjectRole(auth: ProjectAuth): ProjectRole {
  return auth.isAuthenticated && (auth.isSuperAdmin || auth.isDelegated) ? 'admin' : 'user';
}

export function canAccessProjectView(role: ProjectRole, area: 'projects' | 'learners', view: string) {
  const views = area === 'projects'
    ? role === 'admin' ? projectViews : USER_STAFF_VIEWS
    : role === 'admin' ? learnerViews : USER_LEARNER_VIEWS;
  return views.some((allowed) => allowed === view);
}

export function resolveProjectAccessRoute(route: Route, role: ProjectRole): Route {
  return route.area === 'publications' || canAccessProjectView(role, route.area, route.view)
    ? route : { area: route.area, view: 'overview' };
}
