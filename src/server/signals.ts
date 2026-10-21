// Signal correlation (functional port of worldmonitor's cross-stream
// correlation). Surfaces converging/abnormal patterns from the classified news
// set: category surges, country hotspots, and cross-category convergence on a
// single country. Defensive throughout — never throws on thin data.
import type { CountryIndex, EnrichedArticle, SampleStory, Severity, Signal } from "@/types/metrics";

import { labelFor } from "./categories";

const HOUR = 3600 * 1000;
const isRecent = (iso: string | null, now: number, hours = 24) =>
  !!iso && !Number.isNaN(Date.parse(iso)) && now - Date.parse(iso) <= hours * HOUR;

const severityFor = (count: number, negShare: number | null): Severity => {
  const neg = negShare ?? 0;
  if (count >= 8 && neg >= 0.4) return "high";
  if (count >= 5 || neg >= 0.4) return "medium";
  return "low";
};

const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export const computeSignals = (
  news: EnrichedArticle[] = [],
  countryIndex: Pick<CountryIndex, "countries"> = { countries: [] },
  now = Date.now()
): Signal[] => {
  const signals: Signal[] = [];
  const recent = news.filter((n) => isRecent(n.timePublished, now));
  const pool = recent.length >= 6 ? recent : news; // fall back to all if sparse

  // 1) Category surges — most active categories, weighted by negativity.
  const catMap = new Map<string, { count: number; neg: number; scored: number; samples: SampleStory[] }>();
  for (const n of pool) {
    const e = catMap.get(n.category) ?? { count: 0, neg: 0, scored: 0, samples: [] };
    e.count += 1;
    if (typeof n.sentimentScore === "number") {
      e.scored += 1;
      if (n.sentimentScore <= -0.15) e.neg += 1;
    }
    if (e.samples.length < 3) e.samples.push({ title: n.title, url: n.url });
    catMap.set(n.category, e);
  }
  [...catMap.entries()]
    .map(([key, e]) => ({ key, ...e, negShare: e.scored ? e.neg / e.scored : null }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .forEach((c) => {
      signals.push({
        type: "category",
        subject: labelFor(c.key),
        label: `${labelFor(c.key)} activity`,
        detail: `${c.count} recent stories${c.negShare != null ? `, ${Math.round(c.negShare * 100)}% negative` : ""}`,
        severity: severityFor(c.count, c.negShare),
        count: c.count,
        samples: c.samples
      });
    });

  // 2) Country hotspots — top of the risk index.
  countryIndex.countries.slice(0, 3).forEach((c) => {
    if (c.score < 30) return;
    signals.push({
      type: "hotspot",
      subject: c.name,
      label: `${c.name} hotspot`,
      detail: `risk ${c.score}/100 · ${c.count} stories`,
      severity: c.score >= 70 ? "high" : c.score >= 45 ? "medium" : "low",
      count: c.count,
      samples: c.sample ? [c.sample] : []
    });
  });

  // 3) Cross-stream convergence — one country spanning many categories.
  const countryCats = new Map<string, Set<string>>();
  for (const n of pool) {
    if (!n.countryNorm) continue;
    const set = countryCats.get(n.countryNorm) ?? new Set<string>();
    set.add(n.category);
    countryCats.set(n.countryNorm, set);
  }
  [...countryCats.entries()]
    .filter(([, set]) => set.size >= 3)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 2)
    .forEach(([name, set]) => {
      signals.push({
        type: "convergence",
        subject: name,
        label: `${name}: multi-domain`,
        detail: `signals across ${set.size} domains (${[...set].map(labelFor).slice(0, 3).join(", ")})`,
        severity: set.size >= 5 ? "high" : "medium",
        count: set.size,
        samples: []
      });
    });

  return signals.sort((a, b) => RANK[a.severity] - RANK[b.severity]).slice(0, 8);
};
