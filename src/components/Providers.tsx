"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // One client per browser session; created lazily so SSR never shares cache.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            refetchIntervalInBackground: false, // pause polling in hidden tabs
            retry: 2,
            retryDelay: (attempt) => Math.min(30_000, 1000 * 2 ** attempt)
          }
        }
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
