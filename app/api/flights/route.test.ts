import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FlightTuple, LivePayload } from "@/server/live";

const { cacheGet } = vi.hoisted(() => ({ cacheGet: vi.fn() }));
vi.mock("@/server/cache", () => ({
  createKeyedCache: () => ({ get: cacheGet }),
}));
// Keep real parseBBox so validation tests exercise the actual code path.
vi.mock("@/server/live", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/server/live")>();
  return { ...real };
});

import { GET } from "./route";

const bbox = "-0.5,51.3,0.5,51.7";

const makePayload = (count = 2): LivePayload<FlightTuple> => ({
  items: Array.from({ length: count }, (_, i): FlightTuple => [
    `abc${i}`, `BA${i}`, 0 + i * 0.1, 51.5, 35000, 450, 90, "B738", 0,
  ]),
  sources: [{ source: "adsb.lol", ok: true, count }],
  fetchedAt: new Date().toISOString(),
});

const cached = (payload: LivePayload<FlightTuple>) => ({ data: payload, fetchedAt: Date.now() });

const get = (bboxParam: string | null) =>
  GET(new NextRequest(`http://localhost/api/flights${bboxParam !== null ? `?bbox=${bboxParam}` : ""}`));

describe("GET /api/flights", () => {
  beforeEach(() => cacheGet.mockReset());

  it("returns flight tuples and CDN headers for a valid bbox", async () => {
    cacheGet.mockResolvedValue(cached(makePayload(2)));
    const res = await get(bbox);
    expect(res.status).toBe(200);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=");
    const body = await res.json();
    expect(body.items).toHaveLength(2);
    expect(body.items[0]).toHaveLength(9); // FlightTuple = 9-element array
  });

  it("returns 400 when bbox param is missing", async () => {
    const res = await get(null);
    expect(res.status).toBe(400);
    expect(cacheGet).not.toHaveBeenCalled();
  });

  it("returns 400 when bbox is malformed", async () => {
    const res = await get("notabbox");
    expect(res.status).toBe(400);
    expect(cacheGet).not.toHaveBeenCalled();
  });

  it("returns 422 when bbox span exceeds 30°", async () => {
    const res = await get("-50,-50,50,50"); // 100° wide span
    expect(res.status).toBe(422);
    expect(cacheGet).not.toHaveBeenCalled();
  });

  it("still 200 with empty items when adsb.lol fails", async () => {
    cacheGet.mockResolvedValue(cached({ items: [], sources: [{ source: "adsb.lol", ok: false, count: 0, error: "HTTP 429" }], fetchedAt: new Date().toISOString() }));
    const res = await get(bbox);
    expect(res.status).toBe(200);
    expect((await res.json()).items).toHaveLength(0);
  });
});
