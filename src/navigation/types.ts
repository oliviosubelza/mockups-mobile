import type { LucideIcon } from 'lucide-react-native';
import type { ComponentType } from 'react';

/**
 * Single source of truth for a navigable destination. Routes are authored as a
 * nested array in `routes.ts` and processed by `registry.ts`; expo-router only
 * needs the catch-all `app/[...slug].tsx` to render `component`.
 */
export interface RouteInterface {
  /** Stable unique id (key, badge lookup, cross-references). */
  id: string;
  /** expo-router path, e.g. `/despachos` or `/despachos/detalle`. */
  path: string;
  title: string;
  description?: string;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Screen rendered by the catch-all when this route is active. */
  component: ComponentType;
  /** Nested destinations (same shape, recursive). */
  subRoutes?: RouteInterface[];
  /** Defaults to `true`. `false` hides it and blocks navigation. */
  activate?: boolean;
  /** Show as a CardMenu tile on the Home dashboard. */
  showInHome?: boolean;
  /** Reserved: show in the left drawer (not wired yet). */
  showInMenuLeft?: boolean;
  /** Reserved: show in the bottom tab bar (not wired yet). */
  showInMenuBottom?: boolean;
  /** Static badge count (e.g. pending dispatches). Hidden when falsy. */
  badge?: number;
  /** Sort order within a menu surface (ascending). */
  order?: number;
}
