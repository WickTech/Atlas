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
      <div className="inline-flex border border-border">
        {SENTIMENTS.map((s, i) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSentiment(s.key)}
            className={`px-2.5 py-1 text-xs font-bold transition ${i > 0 ? "border-l border-border" : ""} ${
              sentiment === s.key ? "bg-accent text-white" : "text-muted hover:text-fg"
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
  );
}
