"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Country geometry + marker anchors, loaded once per session and shared by map
 * and inspector. Dynamic import keeps topojson-client out of the initial bundle.
 */
export const useCountries = () =>
  useQuery({
    queryKey: ["countries-110m"],
    queryFn: () => import("./countries").then((m) => m.loadCountries()),
    staleTime: Infinity,
    gcTime: Infinity
  }).data ?? null;
