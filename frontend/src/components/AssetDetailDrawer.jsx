import { useEffect, useMemo } from "react";

import { deltaClass, formatIndianNumber, formatPercent, inr } from "../lib/format";
import NewsCard from "./NewsCard";
import Sparkline from "./Sparkline";

// Slide-over drill-down for a selected ticker/coin: price + 24h/7d stats, a mini
// chart, and the news stories that mention it.
export default function AssetDetailDrawer({ ticker, metrics, onClose }) {
  // Close on Escape.
  useEffect(() => {
    if (!ticker) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ticker, onClose]);

  const instrument = useMemo(() => {
    if (!ticker) return null;
    return (metrics?.finance?.instruments || []).find(
      (i) => i.symbol?.toUpperCase() === ticker.toUpperCase()
    );
  }, [ticker, metrics]);

  const relatedNews = useMemo(() => {
    if (!ticker) return [];
    const up = ticker.toUpperCase();
    return (metrics?.news || []).filter(
      (n) =>
        (n.tickerSentiment || []).some((t) => t.ticker?.toUpperCase() === up) ||
        n.title?.toUpperCase().includes(up)
    );
  }, [ticker, metrics]);

  if (!ticker) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-bg p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{ticker.toUpperCase()}</h2>
            {instrument?.name && <p className="text-xs text-muted">{instrument.name}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-content-center rounded-none border border-border text-muted hover:text-fg"
          >
            ✕
          </button>
        </div>

        {instrument ? (
          <div className="panel mb-4 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase text-muted">Price</p>
                <p className="text-2xl font-bold">
                  {instrument.currency === "INR" ? inr(instrument.price, { compact: false }) : formatIndianNumber(instrument.price)}
                </p>
              </div>
              <span className={`text-sm font-semibold ${deltaClass(instrument.changePercent)}`}>
                {formatPercent(instrument.changePercent)}
              </span>
            </div>
            {instrument.sparkline?.length ? (
              <Sparkline data={instrument.sparkline} color="auto" height={56} />
            ) : null}
          </div>
        ) : (
          <p className="panel mb-4 p-4 text-sm text-muted">
            No live market data for {ticker.toUpperCase()} — showing related coverage below.
          </p>
        )}

        <h3 className="mb-2 text-sm font-semibold">
          Related News
          <span className="ml-2 text-xs font-normal text-muted">{relatedNews.length}</span>
        </h3>
        <div className="flex flex-col gap-3">
          {relatedNews.length ? (
            relatedNews
              .slice(0, 12)
              .map((item) => <NewsCard key={`${item.url}-${item.title}`} item={item} />)
          ) : (
            <p className="text-sm text-muted">No stories mention {ticker.toUpperCase()} right now.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
