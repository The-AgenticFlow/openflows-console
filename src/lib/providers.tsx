// Providers: app-wide TanStack Query client + devtools. Centralises the shared
// query defaults (staleTime, retry, focus refetch) used across all data hooks.
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

const defaultOptions = {
  queries: {
    staleTime: 10_000,
    retry: 1,
    refetchOnWindowFocus: false,
  },
};

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
