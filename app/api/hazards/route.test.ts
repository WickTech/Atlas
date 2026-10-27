import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LivePayload } from "@/server/live";
import type { GeoItem } from "@/layers/types";

const { fetchHazards } = vi.hoisted(() => ({ fetchHazards: vi.fn() }));
vi.mock("@/server/live", () => ({ fetchHazards }));
vi.mock("@/server/cache", () => ({
  createCache: (_load: unknown, _ttl: unknown) => ({ get: fetchHazards }),
}));

import { GET } from "./route";

const makePayload = (count = 1): LivePayload<GeoItem> => ({
  items: Array.from({ length: count }, (_, i) => ({
    id: `eq:${i}`,
    kind: "hazard" as const,
    coord: [0, 0] as [number, number],
    title: `EQ ${i}`,
    ts: null,
    severity: "low" as const,
    source: "NASA EONET",
    url: "https://example.com",
    facts: [],
  })),
  sources: [{ source: "NASA EONET", ok: true, count }],
  fetchedAt: new Date().toISOString(),
});

const cached = (payload: LivePayload<GeoItem>) => ({ data: payload, fetchedAt: Date.now() });

describe("GET /api/hazards", () => {
  beforeEach(() => fetchHazards.mockReset());

  it("returns items and sets CDN cache headers", async () => {
    fetchHazards.mockResolvedValue(cached(makePayload(3)));
    const res = await GET();
    expect(res.status).toBe(200);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=600");
    const body = await res.json();
    expect(body.items).toHaveLength(3);
    expect(body.sources[0].ok).toBe(true);
  });

  it("returns an empty items array when all upstreams fail", async () => {
    fetchHazards.mockResolvedValue(cached({ items: [], sources: [{ source: "NASA EONET", ok: false, count: 0, error: "timeout" }], fetchedAt: new Date().toISOString() }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.sources[0].ok).toBe(false);
  });
});
