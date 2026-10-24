"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { clearByok, loadByok, maskKey, saveByok, type ByokProvider } from "@/lib/llmClient";

/**
 * Bring-your-own-key settings. The key is kept in this browser's localStorage
 * and sent only to the chosen provider, directly from the browser — never to
 * Atlas's server.
 */
export function AiSettings({ onClose }: { onClose: () => void }) {
  const existing = loadByok();
  const [provider, setProvider] = useState<ByokProvider>(existing?.provider ?? "groq");
  const [key, setKey] = useState("");
  const [model, setModel] = useState(existing?.model ?? "");
  const [note, setNote] = useState<string | null>(null);

  const save = () => {
    const trimmed = key.trim() || existing?.key || "";
    if (!trimmed) {
      setNote("Enter a key first.");
      return;
    }
    const ok = saveByok({ provider, key: trimmed, model: model.trim() || undefined });
    setNote(ok ? null : "Browser storage is blocked — the key can't be remembered here.");
    if (ok) onClose();
  };

  const remove = () => {
    clearByok();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="ai-settings-title">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <form
        className="relative z-10 flex w-full max-w-md flex-col gap-3 border border-border bg-surface p-4 shadow-panel"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <h2 id="ai-settings-title" className="flex items-center gap-2 text-sm font-bold">
          <KeyRound size={15} aria-hidden="true" /> AI brief settings
        </h2>
        <p className="text-[12px] text-muted">
          Briefs use Atlas&apos;s shared free-tier keys by default (rate-limited). Add your own Groq or OpenRouter key for unlimited, private briefs.
        </p>

        <fieldset className="flex gap-2" aria-label="Provider">
          {(["groq", "openrouter"] as const).map((p) => (
            <label key={p} className={`flex-1 cursor-pointer border px-3 py-1.5 text-center text-[12px] font-bold ${provider === p ? "border-accent text-fg" : "border-border text-muted"}`}>
              <input type="radio" name="provider" value={p} checked={provider === p} onChange={() => setProvider(p)} className="sr-only" />
              {p === "groq" ? "Groq" : "OpenRouter"}
            </label>
          ))}
        </fieldset>

        <label className="flex flex-col gap-1 text-[11px] text-muted">
          API key {existing && <span className="telemetry">saved: {maskKey(existing.key)} ({existing.provider})</span>}
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={existing ? "leave blank to keep the saved key" : provider === "groq" ? "gsk_…" : "sk-or-…"}
            className="border border-border bg-transparent px-2 py-1.5 font-mono text-[12px] text-fg outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-muted">
          Model (optional)
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={provider === "groq" ? "llama-3.1-8b-instant" : "openrouter/free"}
            className="border border-border bg-transparent px-2 py-1.5 font-mono text-[12px] text-fg outline-none focus:border-accent"
          />
        </label>

        <p className="flex gap-2 border border-border bg-surface-2 p-2 text-[11px] text-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-bull" aria-hidden="true" />
          Stored only in this browser (localStorage). Briefs are requested directly from your browser to {provider === "groq" ? "api.groq.com" : "openrouter.ai"} — the key is never sent to Atlas&apos;s
          server. Anyone with access to this browser profile can read it; remove it on shared machines.
        </p>
        {note && (
          <p className="text-[11px] text-sev-5-text" role="alert">
            {note}
          </p>
        )}

        <div className="flex justify-between gap-2">
          {existing ? (
            <button type="button" onClick={remove} className="border border-border px-3 py-1.5 text-[11px] font-bold text-muted hover:text-fg">
              Remove key
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="border border-border px-3 py-1.5 text-[11px] font-bold text-muted hover:text-fg">
              Cancel
            </button>
            <button type="submit" className="border border-accent bg-accent px-3 py-1.5 text-[11px] font-bold text-on-accent">
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
