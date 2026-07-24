import { sentimentBucket } from "../lib/format";

const TONE_LABEL = { bull: "Pos", bear: "Neg", neutral: "Neu" };
const TONE_CLASS = {
  bull: "bg-[color:var(--bull)]/15 text-bull",
  bear: "bg-accent-soft text-accent",
  neutral: "bg-surface-2 text-muted"
};

// Compact headline list for the World Brief strip's right column.
export default function LatestFeed({ news = [] }) {
  const items = news.slice(0, 3);
  return (
    <div>
      <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[.12em] text-accent-400">Latest feed</div>
      <div className="flex flex-col">
        {items.map((n) => {
          const bucket = sentimentBucket(n.sentimentLabel);
          return (
            <a
              key={`${n.url}-${n.title}`}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-2.5 border-b border-[color:var(--border)] py-1.5 text-fg last:border-b-0 hover:text-accent-400"
            >
              <span className="text-[13px]">{n.title}</span>
              <span className={`flex-none px-2 py-0.5 text-[10px] font-bold ${TONE_CLASS[bucket]}`}>
                {TONE_LABEL[bucket]}
              </span>
            </a>
          );
        })}
        {!items.length && <p className="text-xs text-muted">No stories yet.</p>}
      </div>
    </div>
  );
}
