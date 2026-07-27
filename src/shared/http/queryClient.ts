import { QueryClient } from '@tanstack/react-query';

/** App-wide React Query client with sensible RN defaults. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
