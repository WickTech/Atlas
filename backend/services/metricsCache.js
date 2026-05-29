const { generateMetrics } = require("./dataService");

// How long a fetched snapshot is considered fresh. Alpha Vantage free tier is
// rate-limited (~25 req/day), so we never want per-client or per-poll fetches.
const TTL_MS = Number(process.env.METRICS_TTL_MS) || 60000;
// How often the broadcaster pushes to connected SSE clients.
const PUSH_INTERVAL_MS = Number(process.env.METRICS_PUSH_MS) || 15000;

let cached = null; // { data, fetchedAt }
let inflight = null; // de-dupes concurrent refreshes
const subscribers = new Set();
let pushTimer = null;

const isFresh = () => cached && Date.now() - cached.fetchedAt < TTL_MS;

// Returns cached snapshot if fresh, otherwise refreshes (coalescing concurrent
// callers onto a single upstream request).
const getMetrics = async () => {
  if (isFresh()) return cached.data;

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
    return await inflight;
  } catch (error) {
    // Serve stale data on refresh failure rather than breaking the stream.
    if (cached) return cached.data;
    throw error;
  }
};

const broadcast = async () => {
  if (subscribers.size === 0) return;
  let data;
  try {
    data = await getMetrics();
  } catch (_error) {
    return; // skip this tick; clients keep last value
  }
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of subscribers) {
    res.write(payload);
  }
};

// Registers an SSE response; sends an immediate snapshot and starts the shared
// push loop on the first subscriber. Returns an unsubscribe function.
const subscribe = async (res) => {
  subscribers.add(res);

  try {
    const data = await getMetrics();
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (_error) {
    // initial snapshot unavailable; the push loop will retry
  }

  if (!pushTimer) {
    pushTimer = setInterval(broadcast, PUSH_INTERVAL_MS);
  }

  return () => {
    subscribers.delete(res);
    if (subscribers.size === 0 && pushTimer) {
      clearInterval(pushTimer);
      pushTimer = null;
    }
  };
};

module.exports = { getMetrics, subscribe, TTL_MS, PUSH_INTERVAL_MS };
