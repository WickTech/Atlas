// India + global finance radar (functional port of worldmonitor's finance radar).
// Uses Yahoo Finance's free, no-key v8 chart endpoint. Each instrument
// self-falls-back to null so a Yahoo hiccup never breaks the payload.
import type { Finance, Instrument } from "@/types/metrics";

import { fetchWithTimeout, USER_AGENT } from "./fetchWithTimeout";

const YF_BASE = process.env.YF_BASE || "https://query1.finance.yahoo.com/v8/finance/chart";

type InstrumentDef = Pick<Instrument, "symbol" | "name" | "currency" | "region" | "kind">;

// Order = display priority (India first).
export const INSTRUMENTS: InstrumentDef[] = [
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

const round = (v: unknown, dp = 2): number | null => {
  const n = Number(v);
  return v != null && Number.isFinite(n) ? Number(n.toFixed(dp)) : null;
};

interface YahooChart {
  chart?: {
    result?: {
      meta?: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number };
      indicators?: { quote?: { close?: (number | null)[] }[] };
    }[];
  };
}

const fetchQuote = async (inst: InstrumentDef): Promise<Instrument> => {
  try {
    const res = await fetchWithTimeout(`${YF_BASE}/${encodeURIComponent(inst.symbol)}?range=5d&interval=1d`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" }
    });
    if (!res.ok) throw new Error(`YF ${res.status}`);
    const result = ((await res.json()) as YahooChart)?.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) throw new Error("no meta");

    const price = meta.regularMarketPrice ?? null;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const changePercent = price != null && prev ? round(((price - prev) / prev) * 100) : null;
    const closes = (result?.indicators?.quote?.[0]?.close ?? []).filter((c): c is number => c != null);

    return {
      ...inst,
      price: round(price),
      changePercent,
      sparkline: closes.map((c) => round(c) ?? c),
      source: "Yahoo Finance"
    };
  } catch {
    return { ...inst, price: null, changePercent: null, sparkline: [], source: "Fallback" };
  }
};

// Market-composite mood from Indian index moves: average %change of NIFTY +
// SENSEX -> risk-on / risk-off / mixed.
export const computeComposite = (instruments: Instrument[]): Finance["composite"] => {
  const idx = instruments.filter((i) => i.region === "india" && i.kind === "index" && i.changePercent != null);
  if (!idx.length) return { label: "Unknown", value: null };
  const avg = idx.reduce((s, i) => s + (i.changePercent ?? 0), 0) / idx.length;
  const label = avg >= 0.4 ? "Risk-on" : avg <= -0.4 ? "Risk-off" : "Mixed";
  return { label, value: round(avg) };
};

export const fetchFinance = async (): Promise<Finance> => {
  const instruments = await Promise.all(INSTRUMENTS.map(fetchQuote));
  return { instruments, composite: computeComposite(instruments), updatedAt: new Date().toISOString() };
};
