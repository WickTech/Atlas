const { generateMetrics } = require("../shared/metrics");

// Same TTL as backend/services/metricsCache.js — Alpha Vantage free tier is
// rate-limited (~25 req/day), so per-request fetches here would exhaust it
// almost immediately. Module-level state survives across invocations on a
// warm serverless instance (best-effort — a cold start pays one full fetch).
const TTL_MS = Number(process.env.METRICS_TTL_MS) || 60000;

let cached = null; // { data, fetchedAt }
let inflight = null; // de-dupes concurrent cold requests onto one upstream fetch

const isFresh = () => cached && Date.now() - cached.fetchedAt < TTL_MS;

module.exports = async (_req, res) => {
  if (isFresh()) {
    res.status(200).json(cached.data);
    return;
  }

  if (!inflight) {
    inflight = generateMetrics()
      .then((data) => {
        cached = { data, fetchedAt: Date.now() };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  try {
    const data = await inflight;
    res.status(200).json(data);
  } catch (error) {
    if (cached) {
      res.status(200).json(cached.data);
      return;
    }
    throw error;
  }
};
