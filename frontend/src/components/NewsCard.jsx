import { relativeTime, sentimentChipClass } from "../lib/format";

// A single news article: image, title, source/time, sentiment chip, summary,
// topic tags and clickable per-ticker sentiment chips (drill-down).
export default function NewsCard({ item, onSelectTicker }) {
  return (
    <article className="panel flex gap-3 overflow-hidden p-3 transition hover:border-accent">
      {item.bannerImage ? (
        <img
          src={item.bannerImage}
          alt=""
          loading="lazy"
          className="hidden h-24 w-32 shrink-0 rounded-lg object-cover sm:block"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2 text-xs text-muted">
          <span className="truncate font-medium">{item.source || item.sourceDomain}</span>
          {item.timePublished && <span>· {relativeTime(item.timePublished)}</span>}
          <span className={`chip ml-auto shrink-0 ${sentimentChipClass(item.sentimentLabel)}`}>
            {item.sentimentLabel || "Neutral"}
          </span>
        </div>

        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="block font-semibold leading-snug text-fg hover:text-accent"
        >
          {item.title}
        </a>

        {item.summary ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted">{item.summary}</p>
        ) : null}

        {(item.topics?.length || item.tickerSentiment?.length) ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.topics?.slice(0, 3).map((t) => (
              <span key={t} className="chip bg-surface-2 text-muted">
                {t}
              </span>
            ))}
            {item.tickerSentiment?.slice(0, 4).map((t) => (
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
