"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { istTime } from "@/lib/format";
import { useConsole } from "@/state/store";
import type { Briefs, Metrics } from "@/types/metrics";

interface Health {
  label: string;
  value: string;
  tone: "ok" | "warn" | "off";
  title: string;
}

const TONE = { ok: "var(--bull)", warn: "var(--sev-3)", off: "var(--subtle)" } as const;

// Per-source health, computed from what the payload actually contains — a
// source shows green only when it contributed data to this refresh.
//
// `briefingSource` is the provider of the separately fetched AI briefing (see
// /api/briefing), or null while it hasn't been requested: /api/metrics itself
// only ever carries the rule-based digest, so it says nothing about the LLM.
export const sourceHealth = (m: Metrics, briefingSource: Briefs["source"] | null = null): Health[] => {
  const by = (p: string) => m.news.filter((n) => n.provider === p).length;
  const rss = by("RSS");
  const gdelt = by("GDELT");
  const av = by("Alpha Vantage");
  const priced = m.finance.instruments.filter((i) => i.price != null).length;
  return [
    { label: "RSS", value: String(rss), tone: rss ? "ok" : "warn", title: "Publisher RSS articles in this refresh" },
    { label: "GDELT", value: gdelt ? String(gdelt) : "throttled", tone: gdelt ? "ok" : "warn", title: "GDELT DOC API (1 req / 5 s per IP — often rate-limited)" },
    { label: "AV", value: av ? String(av) : "no key", tone: av ? "ok" : "off", title: "Alpha Vantage sentiment articles (needs ALPHA_VANTAGE_API_KEY)" },
    { label: "MKT", value: `${priced}/${m.finance.instruments.length}`, tone: priced ? "ok" : "warn", title: "Yahoo Finance instruments priced" },
    briefingSource
      ? { label: "LLM", value: briefingSource === "rule-based" ? "fallback" : briefingSource, tone: briefingSource === "rule-based" ? "off" : "ok", title: "Briefing generator (Groq → OpenRouter → rule-based)" }
      : { label: "LLM", value: "on demand", tone: "off", title: "The AI briefing is generated when the Brief tab is opened" }
  ];
};

/** Bottom telemetry rail: source health, API latency, last refresh, scrolling headline tape. */
export function StatusBar({ metrics }: { metrics: Metrics }) {
  const telemetry = useConsole((s) => s.telemetry);
  const last = telemetry.metrics?.at(-1);
  // Live-layer feeds report into the same ring buffer (src/lib/fetchJson.ts).
  const liveSources = Object.entries(telemetry)
    .filter(([source]) => source !== "metrics")
    .map(([source, frames]) => ({ source, f: frames.at(-1) }))
    .filter((x): x is { source: string; f: NonNullable<typeof x.f> } => !!x.f);
  // Observe the briefing cache without fetching it (the Brief tab owns the request).
  const { data: briefing } = useQuery<Briefs>({ queryKey: ["briefing"], enabled: false });
  const health = useMemo(() => sourceHealth(metrics, briefing?.source ?? null), [metrics, briefing]);
  const tape = useMemo(() => metrics.news.slice(0, 12), [metrics.news]);

  return (
    <footer className="telemetry z-30 flex h-8 shrink-0 items-center gap-3 overflow-hidden border-t border-border bg-bg px-3 text-[10.5px] text-muted">
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        {health.map((h) => (
          <span key={h.label} title={h.title} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: TONE[h.tone] }} />
            <span className="text-fg">{h.label}</span>
            {h.value}
          </span>
        ))}
        {liveSources.map(({ source, f }) => (
          <span key={source} title={`${source}: last fetch ${f.ok ? "ok" : "failed"} in ${f.latencyMs} ms`} className="hidden items-center gap-1 xl:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: f.ok ? TONE.ok : TONE.warn }} />
            <span className="text-fg">{source.toUpperCase()}</span>
            {f.ok ? f.count : "err"}
          </span>
        ))}
        {last && (
          <span title="Round-trip of the last /api/metrics refresh">
            <span className="text-fg">API</span> {last.ok ? `${last.latencyMs}ms` : "error"}
          </span>
        )}
        <span title="Payload assembled at">
          <span className="text-fg">UPD</span> {istTime(metrics.updatedAt)} IST
        </span>
      </div>

      <div className="relative min-w-0 flex-1 overflow-hidden" aria-label="Latest headlines">
        {/* Duplicated track so the marquee loops seamlessly; hover pauses it. */}
        <div className="tape flex w-max whitespace-nowrap">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-8 pr-8" aria-hidden={copy === 1}>
              {tape.map((n) => (
                <a key={`${copy}-${n.url}`} href={n.url} target="_blank" rel="noreferrer" tabIndex={copy ? -1 : 0} className="hover:text-fg">
                  <span className="text-muted">{n.source}</span> {n.title}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
