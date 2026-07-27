/**
 * Centralized, hierarchical React Query key factory.
 * Mirrors the web app convention so cache invalidation stays predictable.
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  trucks: {
    all: () => ['trucks'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.trucks.all(), 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.trucks.all(), 'detail', id] as const,
  },
  orders: {
    all: () => ['orders'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.orders.all(), 'list', filters ?? {}] as const,
    detail: (id: string) => [...queryKeys.orders.all(), 'detail', id] as const,
  },
} as const;
