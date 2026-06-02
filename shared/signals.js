// Signal correlation (functional port of worldmonitor's cross-stream correlation).
// Surfaces converging/abnormal patterns from the classified news set: category
// surges, country hotspots, and cross-category convergence on a single country.
// Tone is sparse (mostly Alpha Vantage), so signals lean on recent volume +
// available negativity. Defensive throughout — never throws on thin data.
const { labelFor } = require("./categories");
const { normalizeCountryName } = require("./geo");

const HOUR = 3600 * 1000;
const isRecent = (iso, hours = 24) =>
  iso && !Number.isNaN(Date.parse(iso)) && Date.now() - Date.parse(iso) <= hours * HOUR;

const severityFor = (count, negShare) => {
  const neg = negShare || 0;
  if (count >= 8 && neg >= 0.4) return "high";
  if (count >= 5 || neg >= 0.4) return "medium";
  return "low";
};

// news items must already carry `.category` (see metrics.js).
const computeSignals = (news = [], countryIndex = { countries: [] }) => {
  const signals = [];
  const recent = news.filter((n) => isRecent(n.timePublished));
  const pool = recent.length >= 6 ? recent : news; // fall back to all if sparse

  // 1) Category surges — most active categories, weighted by negativity.
  const catMap = new Map();
  for (const n of pool) {
    const key = n.category || "general";
    const e = catMap.get(key) || { count: 0, neg: 0, scored: 0, samples: [] };
    e.count += 1;
    if (typeof n.sentimentScore === "number") {
      e.scored += 1;
      if (n.sentimentScore <= -0.15) e.neg += 1;
    }
    if (e.samples.length < 3) e.samples.push({ title: n.title, url: n.url });
    catMap.set(key, e);
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
  (countryIndex.countries || []).slice(0, 3).forEach((c) => {
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
  const countryCats = new Map();
  for (const n of pool) {
    const name = normalizeCountryName(n.country);
    if (!name) continue;
    const set = countryCats.get(name) || new Set();
    set.add(n.category || "general");
    countryCats.set(name, set);
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

  const rank = { high: 0, medium: 1, low: 2 };
  return signals.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 8);
};

module.exports = { computeSignals };
