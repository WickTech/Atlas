// India + global finance radar (functional port of worldmonitor's finance radar).
// Uses Yahoo Finance's free, no-key v8 chart endpoint. Each instrument self-falls
// back to null so a Yahoo hiccup never breaks the payload. India-first ordering.
const YF_BASE = process.env.YF_BASE || "https://query1.finance.yahoo.com/v8/finance/chart";

// symbol, display name, currency, region, kind. Order = display priority (India first).
const INSTRUMENTS = [
  { symbol: "^NSEI", name: "NIFTY 50", currency: "INR", region: "india", kind: "index" },
  { symbol: "^BSESN", name: "SENSEX", currency: "INR", region: "india", kind: "index" },
  { symbol: "USDINR=X", name: "USD / INR", currency: "INR", region: "india", kind: "forex" },
  { symbol: "RELIANCE.NS", name: "Reliance", currency: "INR", region: "india", kind: "stock" },
  { symbol: "TCS.NS", name: "TCS", currency: "INR", region: "india", kind: "stock" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", currency: "INR", region: "india", kind: "stock" },
  { symbol: "INFY.NS", name: "Infosys", currency: "INR", region: "india", kind: "stock" },
  { symbol: "GC=F", name: "Gold (oz)", currency: "USD", region: "global", kind: "commodity" },
  { symbol: "BZ=F", name: "Brent Crude", currency: "USD", region: "global", kind: "commodity" },
  { symbol: "^GSPC", name: "S&P 500", currency: "USD", region: "global", kind: "index" },
  { symbol: "^N225", name: "Nikkei 225", currency: "JPY", region: "global", kind: "index" }
];

const round = (v, dp = 2) => {
  const n = Number(v);
  return Number.isFinite(n) ? Number(n.toFixed(dp)) : null;
};

const fetchQuote = async (inst) => {
  try {
    const res = await fetch(`${YF_BASE}/${encodeURIComponent(inst.symbol)}?range=5d&interval=1d`, {
      headers: { "User-Agent": "Atlas/1.0", Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`YF ${res.status}`);
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) throw new Error("no meta");

    const price = meta.regularMarketPrice ?? null;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const changePercent =
      price != null && prev ? round(((price - prev) / prev) * 100) : null;
    const closes = (result?.indicators?.quote?.[0]?.close || []).filter((c) => c != null);

    return {
      ...inst,
      price: round(price),
      changePercent,
      sparkline: closes.map((c) => round(c)),
      source: "Yahoo Finance"
    };
  } catch (_error) {
    return { ...inst, price: null, changePercent: null, sparkline: [], source: "Fallback" };
  }
};

// Simple market-composite mood from Indian index moves (worldmonitor's multi-signal
// idea, simplified): average %change of NIFTY + SENSEX -> risk-on / risk-off / mixed.
const computeComposite = (instruments) => {
  const idx = instruments.filter((i) => i.region === "india" && i.kind === "index" && i.changePercent != null);
  if (!idx.length) return { label: "Unknown", value: null };
  const avg = idx.reduce((s, i) => s + i.changePercent, 0) / idx.length;
  const label = avg >= 0.4 ? "Risk-on" : avg <= -0.4 ? "Risk-off" : "Mixed";
  return { label, value: round(avg) };
};

const fetchFinance = async () => {
  // Yahoo tolerates light concurrency; cap it to be polite.
  const results = [];
  for (const inst of INSTRUMENTS) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await fetchQuote(inst));
  }
  return {
    instruments: results,
    composite: computeComposite(results),
    updatedAt: new Date().toISOString()
  };
};

module.exports = { fetchFinance, INSTRUMENTS };
