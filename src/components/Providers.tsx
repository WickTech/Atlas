"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";

// Bump to invalidate every persisted query after a payload-shape change.
const CACHE_BUSTER = "atlas-3";
const MAX_AGE = 6 * 60 * 60_000;

/** localStorage can throw (private mode, quota, blocked site data) — degrade to no persistence. */
const safeStorage = (): Storage | undefined => {
  try {
    const probe = "__atlas_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined;
  }
};

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
            retryDelay: (attempt) => Math.min(30_000, 1000 * 2 ** attempt),
            gcTime: MAX_AGE
          }
        }
      })
  );
  const [persister] = useState(() =>
    createSyncStoragePersister({ storage: typeof window === "undefined" ? undefined : safeStorage(), key: "atlas-query-cache", throttleTime: 2000 })
  );

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: MAX_AGE,
        buster: CACHE_BUSTER,
        // Only small, slow-moving layers opt in (meta.persist); never flights or metrics.
        dehydrateOptions: { shouldDehydrateQuery: (q) => q.meta?.persist === true && q.state.status === "success" }
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
