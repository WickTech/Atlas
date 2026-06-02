import { useMemo, useState } from "react";

import { sentimentBucket } from "../lib/format";
import NewsCard from "./NewsCard";
import NewsFilters from "./NewsFilters";

const PAGE_SIZE = 12;

// Horizontal category chips (functional port of worldmonitor's category sections).
function CategoryNav({ categories, value, onChange }) {
  if (!categories?.length) return null;
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
          value === "all" ? "bg-accent text-[#04130d]" : "bg-surface-2 text-muted hover:text-fg"
        }`}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
            value === c.key ? "bg-accent text-[#04130d]" : "bg-surface-2 text-muted hover:text-fg"
          }`}
        >
          {c.label} <span className="opacity-70">{c.count}</span>
        </button>
      ))}
    </div>
  );
}

// The dashboard centerpiece: India/World scope, category sections, sentiment/topic
// filters, search, and country drill-down all narrow the same feed.
export default function NewsFeed({
  news = [],
  search = "",
  scope = "world",
  selectedCountry = null,
  category = "all",
  categories = [],
  onCategory,
  onClearCountry,
  onSelectTicker
}) {
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
      if (scope === "india" && !n.indiaRelated) return false;
      if (selectedCountry && n.countryNorm !== selectedCountry) return false;
      if (category !== "all" && n.category !== category) return false;
      if (sentiment !== "all" && sentimentBucket(n.sentimentLabel) !== sentiment) return false;
      if (topic !== "all" && !(n.topics || []).includes(topic)) return false;
      if (q) {
        const hay = `${n.title} ${n.summary} ${n.source}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [news, scope, selectedCountry, category, sentiment, topic, search]);

  const shown = filtered.slice(0, visible);

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {scope === "india" ? "India News & Sentiment" : "World News & Sentiment"}
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

      <CategoryNav
        categories={categories}
        value={category}
        onChange={(c) => {
          onCategory?.(c);
          setVisible(PAGE_SIZE);
        }}
      />

      {selectedCountry && (
        <div className="flex items-center gap-2 text-sm">
          <span className="chip bg-accent-soft text-accent">📍 {selectedCountry}</span>
          <button
            type="button"
            onClick={onClearCountry}
            className="text-xs text-muted underline hover:text-fg"
          >
            clear
          </button>
        </div>
      )}

      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
        {shown.length ? (
          shown.map((item) => (
            <NewsCard key={`${item.url}-${item.title}`} item={item} onSelectTicker={onSelectTicker} />
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
