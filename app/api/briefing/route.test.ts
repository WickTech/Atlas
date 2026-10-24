import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Briefs } from "@/types/metrics";

const { getBriefing } = vi.hoisted(() => ({ getBriefing: vi.fn() }));
vi.mock("@/server/briefing", () => ({ getBriefing }));

import { GET } from "./route";

const briefs = (source: Briefs["source"]): Briefs => ({ source, india: "i", global: "g", categories: [], generatedAt: "t" });

describe("GET /api/briefing", () => {
  beforeEach(() => {
    getBriefing.mockReset();
  });

  it("caches an AI briefing at the CDN for 10 minutes", async () => {
    getBriefing.mockResolvedValue(briefs("openrouter"));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toContain("s-maxage=600");
    expect((await res.json()).source).toBe("openrouter");
  });

  it("caches the rule-based fallback for a much shorter time so the model is retried soon", async () => {
    getBriefing.mockResolvedValue(briefs("rule-based"));
    expect((await GET()).headers.get("cache-control")).toContain("s-maxage=90");
  });

  it("answers 503 without caching when the briefing cannot be built", async () => {
    getBriefing.mockImplementation(async () => {
      throw new Error("boom");
    });
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
