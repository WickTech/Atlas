"use client";

import { X } from "lucide-react";
import { useEffect, useMemo } from "react";

import { deltaArrow, deltaClass, formatIndianNumber, formatPercent, inr } from "@/lib/format";
import type { Metrics } from "@/types/metrics";

import { Sparkline } from "../Sparkline";
import { NewsCard } from "./NewsCard";

/** Slide-over drill-down for a ticker/instrument: price, mini chart, related news. */
export function AssetDetailDrawer({ ticker, metrics, onClose }: { ticker: string | null; metrics: Metrics; onClose: () => void }) {
  useEffect(() => {
    if (!ticker) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ticker, onClose]);

  const up = ticker?.toUpperCase() ?? "";
  const instrument = useMemo(() => metrics.finance.instruments.find((i) => i.symbol.toUpperCase() === up), [up, metrics]);
  const relatedNews = useMemo(
    () => (up ? metrics.news.filter((n) => n.tickerSentiment.some((t) => t.ticker.toUpperCase() === up) || n.title.toUpperCase().includes(up)) : []),
    [up, metrics]
  );

  if (!ticker) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`${up} details`}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <aside className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-bg p-5 shadow-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">{up}</h2>
            {instrument?.name && <p className="text-xs text-muted">{instrument.name}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-content-center border border-border text-muted hover:text-fg">
            <X size={16} />
          </button>
        </div>

        {instrument ? (
          <div className="panel mb-4 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-muted uppercase">Price</p>
                <p className="telemetry text-2xl font-bold">
                  {instrument.currency === "INR" ? inr(instrument.price, { compact: false }) : formatIndianNumber(instrument.price)}
                </p>
              </div>
              <span className={`telemetry text-sm font-semibold ${deltaClass(instrument.changePercent)}`}>{deltaArrow(instrument.changePercent)} {formatPercent(instrument.changePercent)}</span>
            </div>
            {instrument.sparkline.length ? <Sparkline data={instrument.sparkline} height={56} /> : null}
          </div>
        ) : (
          <p className="panel mb-4 p-4 text-sm text-muted">No live market data for {up} — showing related coverage below.</p>
        )}

        <h3 className="mb-2 text-sm font-semibold">
          Related News <span className="ml-2 text-xs font-normal text-muted">{relatedNews.length}</span>
        </h3>
        <div className="flex flex-col gap-3">
          {relatedNews.length ? (
            relatedNews.slice(0, 12).map((item) => <NewsCard key={`${item.url}-${item.title}`} item={item} />)
          ) : (
            <p className="text-sm text-muted">No stories mention {up} right now.</p>
          )}
        </div>
      </aside>
    </div>
  );
}
