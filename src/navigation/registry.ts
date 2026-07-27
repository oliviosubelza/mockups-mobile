import { router } from 'expo-router';

import { routes } from './routes';
import type { RouteInterface } from './types';

/** Strip leading/trailing slashes: `/despachos/detalle` -> `despachos/detalle`. */
function normalizePath(path: string): string {
  return path.replace(/^\/+|\/+$/g, '');
}

const byOrder = (a: RouteInterface, b: RouteInterface) =>
  (a.order ?? 0) - (b.order ?? 0);

/** A route is active unless explicitly disabled. */
export const isActive = (route: RouteInterface): boolean =>
  route.activate !== false;

/** Flatten the route tree (including `subRoutes`) into a path-indexed map. */
export function flattenRoutes(
  list: RouteInterface[] = routes,
): Map<string, RouteInterface> {
  const map = new Map<string, RouteInterface>();
  const walk = (items: RouteInterface[]) => {
    for (const item of items) {
      map.set(normalizePath(item.path), item);
      if (item.subRoutes?.length) walk(item.subRoutes);
    }
  };
  walk(list);
  return map;
}

const registry = flattenRoutes();

/** Resolve the catch-all `slug` segments to a route (or undefined). */
export function resolveRoute(
  slug: string[] | string | undefined,
): RouteInterface | undefined {
  const segments = Array.isArray(slug) ? slug : slug ? [slug] : [];
  return registry.get(segments.filter(Boolean).join('/'));
}

/** Find any route (including nested) by its id. */
export function findRouteById(id: string): RouteInterface | undefined {
  for (const route of registry.values()) {
    if (route.id === id) return route;
  }
  return undefined;
}

/** Top-level routes shown as tiles on the Home dashboard. */
export function getHomeRoutes(): RouteInterface[] {
  return routes.filter((r) => isActive(r) && r.showInHome).sort(byOrder);
}

/** Reserved for the bottom tab bar. */
export function getBottomRoutes(): RouteInterface[] {
  return routes.filter((r) => isActive(r) && r.showInMenuBottom).sort(byOrder);
}

/** Reserved for the left drawer. */
export function getLeftRoutes(): RouteInterface[] {
  return routes.filter((r) => isActive(r) && r.showInMenuLeft).sort(byOrder);
}

/**
 * Navigate to a route through the catch-all. Using the static `/[...slug]`
 * pathname keeps this type-safe under `typedRoutes` — no `Href` cast needed.
 */
export function navigateTo(route: RouteInterface): void {
  if (!isActive(route)) return;
  const slug = normalizePath(route.path).split('/').filter(Boolean);
  router.push({ pathname: '/[...slug]', params: { slug } });
}
