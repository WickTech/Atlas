// Country Intelligence Index (functional port of worldmonitor's per-country risk
// scoring, simplified to the signals Atlas actually has: news volume, available
// per-article sentiment, and recency). Produces a 0–100 score per country that
// drives both the India-centered choropleth and the ranked risk panel.
const { normalizeCountryName, INDIA } = require("./geo");

const HOUR = 3600 * 1000;

// Recency weight: articles in the last 24h count fully, older ones decay.
const recencyWeight = (iso, now) => {
  if (!iso) return 0.5;
  const ageH = (now - Date.parse(iso)) / HOUR;
  if (Number.isNaN(ageH)) return 0.5;
  if (ageH <= 6) return 1;
  if (ageH <= 24) return 0.8;
  if (ageH <= 72) return 0.5;
  return 0.3;
};

// Builds { countries: [...sorted by score desc], max, india } from the merged
// news list. `score` blends activity (volume) with negativity + recency so a
// country with many recent negative-tone stories ranks highest.
const computeCountryIndex = (news = []) => {
  const now = Date.now();
  const byCountry = new Map();

  for (const n of news) {
    const name = normalizeCountryName(n.country);
    if (!name) continue;
    const entry =
      byCountry.get(name) || { name, count: 0, weighted: 0, scoreSum: 0, scored: 0, neg: 0, sample: null };
    entry.count += 1;
    entry.weighted += recencyWeight(n.timePublished, now);
    if (typeof n.sentimentScore === "number") {
      entry.scoreSum += n.sentimentScore;
      entry.scored += 1;
      if (n.sentimentScore <= -0.15) entry.neg += 1;
    }
    if (!entry.sample) entry.sample = { title: n.title, url: n.url };
    byCountry.set(name, entry);
  }

  if (byCountry.size === 0) {
    return { countries: [], max: 0, india: null };
  }

  const maxWeighted = Math.max(...[...byCountry.values()].map((e) => e.weighted));

  const countries = [...byCountry.values()]
    .map((e) => {
      const avgScore = e.scored ? Number((e.scoreSum / e.scored).toFixed(3)) : null;
      const negShare = e.scored ? e.neg / e.scored : null;
      // Activity 0..1 (dominant signal given sparse per-article tone).
      const activity = maxWeighted ? e.weighted / maxWeighted : 0;
      // Negativity 0..1: known negativity, else neutral 0.5.
      const negativity = negShare == null ? 0.5 : 0.3 + 0.7 * negShare;
      const score = Math.round(100 * (0.65 * activity + 0.35 * negativity));
      return {
        name: e.name,
        count: e.count,
        avgScore,
        negShare: negShare == null ? null : Number(negShare.toFixed(2)),
        score,
        sample: e.sample
      };
    })
    .sort((a, b) => b.score - a.score);

  const max = Math.max(...countries.map((c) => c.score), 0);
  const india = countries.find((c) => c.name === INDIA) || null;

  return { countries, max, india };
};

module.exports = { computeCountryIndex };
