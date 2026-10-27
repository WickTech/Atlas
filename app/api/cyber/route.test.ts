import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CyberPayload } from "@/server/live";

const { fetchCyber } = vi.hoisted(() => ({ fetchCyber: vi.fn() }));
vi.mock("@/server/live", () => ({ fetchCyber }));
vi.mock("@/server/cache", () => ({
  createCache: (_load: unknown, _ttl: unknown) => ({ get: fetchCyber }),
}));

import { GET } from "./route";

const makePayload = (): CyberPayload => ({
  outages: [{ country: "IN", code: "IN", score: 0.8, signals: ["bgp"], events: 1 }],
  c2: [{ country: "RU", malware: "Emotet", status: "online", asName: "AS1234", lastOnline: "2026-01-01" }],
  kev: [{ cve: "CVE-2024-0001", vendor: "ACME", product: "Widget", name: "RCE", added: "2024-01-01", due: "2024-01-15", ransomware: false }],
  kevTotal: 1200,
  sources: [
    { source: "IODA", ok: true, count: 1 },
    { source: "abuse.ch Feodo", ok: true, count: 1 },
    { source: "CISA KEV", ok: true, count: 1 },
  ],
  fetchedAt: new Date().toISOString(),
});

const cached = (payload: CyberPayload) => ({ data: payload, fetchedAt: Date.now() });

describe("GET /api/cyber", () => {
  beforeEach(() => fetchCyber.mockReset());

  it("returns outages, c2 and kev with correct CDN headers", async () => {
    fetchCyber.mockResolvedValue(cached(makePayload()));
    const res = await GET();
    expect(res.status).toBe(200);
    const cc = res.headers.get("cache-control") ?? "";
    expect(cc).toContain("s-maxage=900");
    const body = await res.json();
    expect(body.outages).toHaveLength(1);
    expect(body.c2).toHaveLength(1);
    expect(body.kev).toHaveLength(1);
    expect(body.kevTotal).toBe(1200);
  });

  it("still 200 with empty arrays when all upstreams fail", async () => {
    fetchCyber.mockResolvedValue(cached({
      outages: [], c2: [], kev: [], kevTotal: 0,
      sources: [
        { source: "IODA", ok: false, count: 0, error: "timeout" },
        { source: "abuse.ch Feodo", ok: false, count: 0, error: "timeout" },
        { source: "CISA KEV", ok: false, count: 0, error: "timeout" },
      ],
      fetchedAt: new Date().toISOString(),
    }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.outages).toHaveLength(0);
    expect(body.c2).toHaveLength(0);
  });
});
