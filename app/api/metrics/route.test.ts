import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Metrics } from "@/types/metrics";

// metricsCache is module-level state in the route; mock the whole module.
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock("@/server/metricsCache", () => ({
  metricsCache: { get: mockGet },
}));

import { GET } from "./route";

const stubMetrics = (): Metrics => ({
  sentiment: { score: 0.1, label: "neutral", breakdown: [] },
  news: [],
  topTickers: [],
  bestStock: { symbol: "AAPL", change: 0.5, price: 200 },
  countryIndex: {},
  signals: [],
  categories: [],
  briefs: { source: "rule-based", india: "", global: "", categories: [], generatedAt: "" },
  finance: { instruments: [], updatedAt: "" },
  dataSources: ["RSS"],
  updatedAt: new Date().toISOString(),
});

describe("GET /api/metrics", () => {
  beforeEach(() => mockGet.mockReset());

  it("returns metrics with short CDN cache headers", async () => {
    mockGet.mockResolvedValue({ data: stubMetrics(), fetchedAt: Date.now() });
    const res = await GET();
    expect(res.status).toBe(200);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=60");
    const body = await res.json();
    expect(body).toHaveProperty("news");
    expect(body).toHaveProperty("sentiment");
  });

  it("sets X-Atlas-Fetched-At header from cache timestamp", async () => {
    const fetchedAt = Date.now();
    mockGet.mockResolvedValue({ data: stubMetrics(), fetchedAt });
    const res = await GET();
    expect(res.headers.get("x-atlas-fetched-at")).toBe(new Date(fetchedAt).toISOString());
  });

  it("returns 503 without caching when metricsCache throws", async () => {
    // Returning undefined triggers a TypeError at the route's destructure step,
    // exercising the catch branch without a race between throw and await.
    mockGet.mockResolvedValue(undefined);
    const res = await GET();
    expect(res.status).toBe(503);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).error).toBeTruthy();
  });
});
