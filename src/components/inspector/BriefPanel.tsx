"use client";

import { useMutation } from "@tanstack/react-query";
import { KeyRound, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";

import type { BriefInput } from "@/lib/brief";
import { loadByok, requestBrief } from "@/lib/llmClient";
import { useConsole } from "@/state/store";

const PROVIDER_LABEL = { groq: "Groq", openrouter: "OpenRouter", "rule-based": "rule-based digest" } as const;

/**
 * On-demand AI brief for the inspected subject. Never automatic: each brief is
 * a free-tier LLM call, so the analyst asks for one. Uses the viewer's own key
 * (direct to provider) when configured, else the shared server keys.
 */
export function BriefPanel({ input }: { input: BriefInput | null }) {
  const setUi = useConsole((s) => s.setUi);
  const aiOpen = useConsole((s) => s.ui.modal === "ai");
  // Only rendered client-side for a live selection, so reading storage here is
  // safe; recomputed when the settings modal opens/closes (key added/removed).
  // eslint-disable-next-line react-hooks/exhaustive-deps -- aiOpen is the invalidation signal
  const hasKey = useMemo(() => !!loadByok(), [aiOpen]);

  const brief = useMutation({ mutationFn: (i: BriefInput) => requestBrief(i, loadByok()) });

  // A new subject invalidates the previous brief.
  const subjectKey = input ? `${input.kind}:${input.subject}` : "";
  const { reset } = brief;
  useEffect(() => reset(), [subjectKey, reset]);

  if (!input) return null;

  return (
    <section className="flex flex-col gap-2 border-t border-border px-3 py-3" aria-label="AI brief">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Situational brief</span>
        <button type="button" onClick={() => setUi({ modal: "ai" })} className="telemetry inline-flex items-center gap-1 text-[10px] text-muted hover:text-fg" title="AI settings: use your own key">
          <KeyRound size={11} aria-hidden="true" /> {hasKey ? "your key" : "free tier"}
        </button>
      </div>

      {brief.data ? (
        <>
          <p className="text-[12.5px] leading-relaxed text-fg">{brief.data.text}</p>
          <p className="telemetry text-[10px] text-muted">
            {brief.data.provider === "rule-based"
              ? "No LLM available — deterministic digest of the facts above"
              : `AI · ${PROVIDER_LABEL[brief.data.provider]}${brief.data.model ? ` · ${brief.data.model}` : ""}${brief.data.byok ? " · your key" : ""}${brief.data.cached ? " · cached" : ""}`}
            {" · generated only from the facts and headlines shown"}
          </p>
        </>
      ) : (
        <p className="text-[11px] text-muted">Summarise the live facts and headlines above in 3–4 sentences. Uses only what&apos;s shown — no outside knowledge.</p>
      )}

      {brief.isError && (
        <p className="text-[11px] text-accent-400" role="alert">
          {brief.error instanceof Error ? brief.error.message : "Brief failed"}
        </p>
      )}

      <button
        type="button"
        onClick={() => brief.mutate(input)}
        disabled={brief.isPending}
        className="inline-flex items-center justify-center gap-1.5 border border-accent px-3 py-1.5 text-[11px] font-bold tracking-wider text-accent uppercase transition hover:bg-accent hover:text-white disabled:opacity-60"
      >
        <Sparkles size={12} aria-hidden="true" className={brief.isPending ? "animate-pulse" : ""} />
        {brief.isPending ? "Generating…" : brief.data ? "Regenerate" : "Generate brief"}
      </button>
    </section>
  );
}
