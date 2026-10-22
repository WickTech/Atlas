import { beforeEach, describe, expect, it } from "vitest";

import { threatLevel } from "@/lib/threat";
import type { Signal } from "@/types/metrics";

import { initialState, selectedCountryOf, TELEMETRY_WINDOW, useConsole } from "./store";

beforeEach(() => useConsole.setState(initialState()));

describe("console store", () => {
  it("toggles layers and patches layer state immutably", () => {
    const before = useConsole.getState().layers;
    useConsole.getState().toggleLayer("news");
    useConsole.getState().setLayer("risk", { count: 12, status: "ready" });
    const after = useConsole.getState().layers;
    expect(after.news.enabled).toBe(false);
    expect(after.risk).toMatchObject({ count: 12, status: "ready", enabled: true });
    expect(before.news.enabled).toBe(true);
  });

  it("setLayer is referentially stable when the patch changes nothing", () => {
    const before = useConsole.getState().layers;
    useConsole.getState().setLayer("risk", { enabled: true, opacity: 1 });
    expect(useConsole.getState().layers).toBe(before);
  });

  it("selectCountry toggles off when re-selected", () => {
    const { selectCountry } = useConsole.getState();
    selectCountry("India");
    expect(selectedCountryOf(useConsole.getState())).toBe("India");
    selectCountry("India");
    expect(useConsole.getState().selection).toBeNull();
  });

  it("caps telemetry per source", () => {
    const push = useConsole.getState().pushTelemetry;
    for (let i = 0; i < TELEMETRY_WINDOW + 5; i++) push({ source: "metrics", fetchedAt: "", latencyMs: i, count: 0, ok: true });
    const frames = useConsole.getState().telemetry.metrics ?? [];
    expect(frames).toHaveLength(TELEMETRY_WINDOW);
    expect(frames.at(-1)?.latencyMs).toBe(TELEMETRY_WINDOW + 4);
  });

  it("hydrate merges partial layer patches", () => {
    useConsole.getState().hydrate({ layers: { news: { enabled: false } }, filters: { scope: "world" } });
    const s = useConsole.getState();
    expect(s.layers.news).toMatchObject({ enabled: false, opacity: 1 });
    expect(s.layers.risk.enabled).toBe(true);
    expect(s.filters).toMatchObject({ scope: "world", lens: "World" });
  });
});

describe("threatLevel", () => {
  const sig = (severity: Signal["severity"]): Signal => ({ type: "category", subject: "", label: "", detail: "", severity, count: 1, samples: [] });
  it("maps high-severity count to posture", () => {
    expect(threatLevel([]).level).toBe("LOW");
    expect(threatLevel([sig("high"), sig("medium")]).level).toBe("GUARDED");
    expect(threatLevel([sig("high"), sig("high")]).level).toBe("ELEVATED");
    expect(threatLevel(Array.from({ length: 4 }, () => sig("high")))).toEqual({ level: "HIGH", highs: 4 });
  });
});
