import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnReconnect: true,
      refetchOnMount: false,
      staleTime: 60_000
    },
    mutations: {
      retry: 0
    }
  }
});
