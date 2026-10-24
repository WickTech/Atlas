import { describe, expect, it } from "vitest";

import type { Metrics } from "@/types/metrics";

import { sourceHealth } from "./StatusBar";

// Only the fields sourceHealth reads.
const metrics = { news: [{ provider: "RSS" }], finance: { instruments: [{ price: 1 }] }, briefs: { source: "rule-based" } } as unknown as Metrics;
const llm = (briefingSource?: "groq" | "openrouter" | "rule-based" | null) => sourceHealth(metrics, briefingSource).find((h) => h.label === "LLM");

describe("sourceHealth LLM item", () => {
  it("says 'on demand', not 'fallback', before the AI briefing has been requested", () => {
    expect(llm()).toMatchObject({ value: "on demand", tone: "off" });
    expect(llm(null)).toMatchObject({ value: "on demand" });
  });
  it("shows the provider once the briefing arrived, and 'fallback' when the model failed", () => {
    expect(llm("openrouter")).toMatchObject({ value: "openrouter", tone: "ok" });
    expect(llm("rule-based")).toMatchObject({ value: "fallback", tone: "off" });
  });
});
