const SENTIMENTS = [
  { key: "all", label: "All" },
  { key: "bull", label: "Bullish" },
  { key: "neutral", label: "Neutral" },
  { key: "bear", label: "Bearish" }
];

// Sentiment segmented filter + topic dropdown for the news feed. Search lives in
// the TopBar and is passed through the same filter state.
export default function NewsFilters({ sentiment, onSentiment, topic, onTopic, topics }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-border bg-surface-2 p-0.5">
        {SENTIMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSentiment(s.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              sentiment === s.key ? "bg-accent text-[#04130d]" : "text-muted hover:text-fg"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {topics?.length ? (
        <select
          value={topic}
          onChange={(e) => onTopic(e.target.value)}
          className="rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs text-fg outline-none focus:border-accent"
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
  );
}
