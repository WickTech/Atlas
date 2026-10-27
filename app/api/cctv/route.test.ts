import { beforeEach, describe, expect, it, vi } from "vitest";

import type { LivePayload } from "@/server/live";
import type { GeoItem } from "@/layers/types";

const { fetchCctv } = vi.hoisted(() => ({ fetchCctv: vi.fn() }));
vi.mock("@/server/live", () => ({ fetchCctv }));
vi.mock("@/server/cache", () => ({
  createCache: () => ({ get: fetchCctv }),
}));

import { GET } from "./route";

const makePayload = (count = 2): LivePayload<GeoItem> => ({
  items: Array.from({ length: count }, (_, i) => ({
    id: `tfl:${i}`,
    kind: "cctv",
    coord: [-0.1 + i * 0.01, 51.5] as [number, number],
    title: `Camera ${i}`,
    ts: null,
    severity: "low" as const,
    source: "TfL JamCams",
    url: "https://tfl.gov.uk",
    facts: [],
    media: `https://example.com/cam${i}.jpg`,
  })),
  sources: [{ source: "TfL JamCams", ok: true, count }],
  fetchedAt: new Date().toISOString(),
});

const cached = (payload: LivePayload<GeoItem>) => ({ data: payload, fetchedAt: Date.now() });

describe("GET /api/cctv", () => {
  beforeEach(() => fetchCctv.mockReset());

  it("returns camera items with long CDN cache (camera list changes rarely)", async () => {
    fetchCctv.mockResolvedValue(cached(makePayload(2)));
    const res = await GET();
    expect(res.status).toBe(200);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=3600");
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0].kind).toBe("cctv");
  });

  it("still 200 with empty items when TfL upstream fails", async () => {
    fetchCctv.mockResolvedValue(cached({ items: [], sources: [{ source: "TfL JamCams", ok: false, count: 0, error: "HTTP 503" }], fetchedAt: new Date().toISOString() }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(0);
  });
});
