// News filtering shared by the feed and the map so both always show the same
// slice. Country selection is intentionally *not* applied here — the map keeps
// every marker visible while the feed narrows to the selection.
import type { EnrichedArticle } from "@/types/metrics";

import { LENS_CATEGORY, type Lens, type Scope } from "./constants";

export interface NewsFilter {
  scope: Scope;
  lens: Lens;
  category: string;
  search: string;
}

/** Lens forces a category (Finance/Commodity → markets, Energy → energy); otherwise the chosen one. */
export const effectiveCategory = (f: Pick<NewsFilter, "lens" | "category">) => LENS_CATEGORY[f.lens] ?? f.category;

export const filterNews = (news: EnrichedArticle[], f: NewsFilter): EnrichedArticle[] => {
  const q = f.search.trim().toLowerCase();
  const category = effectiveCategory(f);
  return news.filter((n) => {
    if (f.scope === "india" && !n.indiaRelated) return false;
    if (category !== "all" && n.category !== category) return false;
    if (q && !`${n.title} ${n.summary} ${n.source ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
};

export interface CountryCluster {
  name: string;
  coord: [number, number];
  count: number;
  latest: EnrichedArticle;
}

/** One marker per country: story count + most recent headline, largest first (drawn last = on top). */
export const clusterByCountry = (news: EnrichedArticle[], anchors: Map<string, [number, number]>): CountryCluster[] => {
  const byName = new Map<string, CountryCluster>();
  for (const n of news) {
    if (!n.countryNorm) continue;
    const coord = anchors.get(n.countryNorm);
    if (!coord) continue;
    const c = byName.get(n.countryNorm);
    if (!c) {
      byName.set(n.countryNorm, { name: n.countryNorm, coord, count: 1, latest: n });
      continue;
    }
    c.count += 1;
    if ((n.timePublished ?? "") > (c.latest.timePublished ?? "")) c.latest = n;
  }
  return [...byName.values()].sort((a, b) => a.count - b.count);
};
