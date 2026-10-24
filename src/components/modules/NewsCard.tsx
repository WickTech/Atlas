/* eslint-disable @next/next/no-img-element -- remote publisher images from arbitrary hosts; next/image would need an open remotePatterns proxy */
import { relativeTime, sentimentChipClass } from "@/lib/format";
import type { Article } from "@/types/metrics";

/** One article: image, title, source/time, sentiment chip, summary, topic + ticker chips. */
export function NewsCard({ item, onSelectTicker }: { item: Article; onSelectTicker?: (ticker: string) => void }) {
  return (
    <article className="@container panel flex shrink-0 gap-3 overflow-hidden p-3 transition-colors hover:border-accent">
      {item.bannerImage ? (
        <img
          src={item.bannerImage}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="hidden h-16 w-24 shrink-0 object-cover @sm:block"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span className="truncate font-medium">{item.source || item.sourceDomain}</span>
          {item.timePublished && <span className="telemetry">· {relativeTime(item.timePublished)}</span>}
          <span
            className={`chip ml-auto shrink-0 ${sentimentChipClass(item.sentimentLabel)}`}
            title={item.sentimentMethod === "headline-wording" ? "Estimated from the headline's wording" : item.sentimentMethod === "alpha-vantage" ? "Alpha Vantage news sentiment" : undefined}
          >
            {item.sentimentLabel || "Neutral"}
          </span>
        </div>

        <a href={item.url} target="_blank" rel="noreferrer" className="block text-sm leading-snug font-semibold text-fg hover:text-accent">
          {item.title}
        </a>

        {item.summary ? <p className="mt-1 line-clamp-2 text-sm text-muted">{item.summary}</p> : null}

        {item.topics.length || item.tickerSentiment.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.topics.slice(0, 3).map((t) => (
              <span key={t} className="chip bg-surface-2 text-muted">
                {t}
              </span>
            ))}
            {item.tickerSentiment.slice(0, 4).map((t) => (
              <button
                key={t.ticker}
                type="button"
                onClick={() => onSelectTicker?.(t.ticker)}
                className={`chip transition hover:ring-1 hover:ring-accent ${sentimentChipClass(t.label)}`}
                title={`View ${t.ticker}`}
              >
                {t.ticker}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
