import { useMemo, useState } from "react";

import { sentimentBucket } from "../lib/format";
import NewsCard from "./NewsCard";
import NewsFilters from "./NewsFilters";

const PAGE_SIZE = 12;

// The dashboard centerpiece: filterable, searchable, paginated world-news feed.
export default function NewsFeed({ news = [], search = "", onSelectTicker }) {
  const [sentiment, setSentiment] = useState("all");
  const [topic, setTopic] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const topics = useMemo(() => {
    const set = new Set();
    for (const n of news) for (const t of n.topics || []) set.add(t);
    return Array.from(set).sort();
  }, [news]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return news.filter((n) => {
      if (sentiment !== "all" && sentimentBucket(n.sentimentLabel) !== sentiment) return false;
      if (topic !== "all" && !(n.topics || []).includes(topic)) return false;
      if (q) {
        const hay = `${n.title} ${n.summary} ${n.source}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [news, sentiment, topic, search]);

  const shown = filtered.slice(0, visible);

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          World News & Sentiment
          <span className="ml-2 text-sm font-normal text-muted">{filtered.length} stories</span>
        </h2>
        <NewsFilters
          sentiment={sentiment}
          onSentiment={(s) => {
            setSentiment(s);
            setVisible(PAGE_SIZE);
          }}
          topic={topic}
          onTopic={(t) => {
            setTopic(t);
            setVisible(PAGE_SIZE);
          }}
          topics={topics}
        />
      </div>

      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
        {shown.length ? (
          shown.map((item) => (
            <NewsCard
              key={`${item.url}-${item.title}`}
              item={item}
              onSelectTicker={onSelectTicker}
            />
          ))
        ) : (
          <p className="py-8 text-center text-muted">No stories match these filters.</p>
        )}

        {visible < filtered.length && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="mt-1 self-center rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition hover:border-accent hover:text-accent"
          >
            Load more
          </button>
        )}
      </div>
    </section>
  );
}
