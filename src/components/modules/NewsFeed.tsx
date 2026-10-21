"use client";

import { useMemo, useState } from "react";

import { sentimentBucket, type Bucket } from "@/lib/format";
import { effectiveCategory, filterNews, type NewsFilter } from "@/lib/news";
import type { CategoryCount, EnrichedArticle } from "@/types/metrics";

import { NewsCard } from "./NewsCard";

const PAGE_SIZE = 12;
const SENTIMENTS: { key: Bucket | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "bull", label: "Bullish" },
  { key: "neutral", label: "Neutral" },
  { key: "bear", label: "Bearish" }
];

const segBtn = (active: boolean, first: boolean) =>
  `px-2.5 py-1 text-xs font-bold transition ${first ? "" : "border-l border-border"} ${active ? "bg-accent text-white" : "text-muted hover:text-fg"}`;

const chipBtn = (active: boolean) =>
  `shrink-0 border px-3 py-1 text-xs font-bold transition ${active ? "border-accent bg-accent text-white" : "border-border bg-surface-2 text-muted hover:text-fg"}`;

interface Props {
  news: EnrichedArticle[];
  filter: NewsFilter;
  selectedCountry: string | null;
  categories: CategoryCount[];
  onCategory: (key: string) => void;
  onClearCountry: () => void;
  onSelectTicker: (ticker: string) => void;
}

// India/World scope, category sections, sentiment/topic filters, search and
// country drill-down all narrow the same feed.
export function NewsFeed({ news, filter, selectedCountry, categories, onCategory, onClearCountry, onSelectTicker }: Props) {
  const { scope } = filter;
  const category = effectiveCategory(filter);
  const [sentiment, setSentiment] = useState<Bucket | "all">("all");
  const [topic, setTopic] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const topics = useMemo(() => [...new Set(news.flatMap((n) => n.topics))].sort(), [news]);

  const filtered = useMemo(
    () =>
      filterNews(news, filter).filter((n) => {
        if (selectedCountry && n.countryNorm !== selectedCountry) return false;
        if (sentiment !== "all" && sentimentBucket(n.sentimentLabel) !== sentiment) return false;
        if (topic !== "all" && !n.topics.includes(topic)) return false;
        return true;
      }),
    [news, filter, selectedCountry, sentiment, topic]
  );

  const reset = () => setVisible(PAGE_SIZE);

  return (
    <section className="flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {scope === "india" ? "India news" : "World news"}
          <span className="telemetry ml-2 text-sm font-normal text-muted">{filtered.length} stories</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex border border-border" role="group" aria-label="Sentiment filter">
            {SENTIMENTS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                aria-pressed={sentiment === s.key}
                onClick={() => {
                  setSentiment(s.key);
                  reset();
                }}
                className={segBtn(sentiment === s.key, i === 0)}
              >
                {s.label}
              </button>
            ))}
          </div>
          {topics.length ? (
            <select
              value={topic}
              aria-label="Topic filter"
              onChange={(e) => {
                setTopic(e.target.value);
                reset();
              }}
              className="border border-border bg-surface-2 px-2 py-1.5 text-xs text-fg outline-none focus:border-accent"
            >
              <option value="all">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {categories.length ? (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button type="button" onClick={() => {
            onCategory("all");
            reset();
          }} className={chipBtn(category === "all")}>
            All
          </button>
          {categories.map((c) => (
            <button key={c.key} type="button" onClick={() => {
              onCategory(c.key);
              reset();
            }} className={chipBtn(category === c.key)}>
              {c.label} <span className="opacity-70">{c.count}</span>
            </button>
          ))}
        </div>
      ) : null}

      {selectedCountry && (
        <div className="flex items-center gap-2 text-sm">
          <span className="chip bg-accent-soft text-accent">📍 {selectedCountry}</span>
          <button type="button" onClick={onClearCountry} className="text-xs text-muted underline hover:text-fg">
            clear
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {filtered.length ? (
          filtered.slice(0, visible).map((item) => <NewsCard key={`${item.url}-${item.title}`} item={item} onSelectTicker={onSelectTicker} />)
        ) : (
          <p className="py-8 text-center text-muted">No stories match these filters.</p>
        )}
        {visible < filtered.length && (
          <button
            type="button"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="mt-1 self-center border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-fg transition hover:border-accent hover:text-accent"
          >
            Load more
          </button>
        )}
      </div>
    </section>
  );
}
