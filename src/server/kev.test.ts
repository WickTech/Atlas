import { describe, expect, it } from "vitest";

import { KEV_LIMIT, parseKev } from "./live";

const entry = (cveID: string, dateAdded: string, extra: Record<string, unknown> = {}) => ({
  cveID,
  vendorProject: "Acme",
  product: "Widget",
  vulnerabilityName: `${cveID} flaw`,
  dateAdded,
  dueDate: "2026-11-20",
  knownRansomwareCampaignUse: "Unknown",
  shortDescription: "long text we don't ship to the browser",
  requiredAction: "more long text",
  ...extra
});

describe("parseKev", () => {
  it("returns the newest entries first, with ties broken by CVE id, and the full catalog size", () => {
    const feed = { vulnerabilities: [entry("CVE-2026-1", "2026-10-01"), entry("CVE-2026-3", "2026-10-20"), entry("CVE-2026-2", "2026-10-20"), entry("CVE-2025-9", "2025-01-01")] };
    const { items, total } = parseKev(feed, 3);
    expect(items.map((i) => i.cve)).toEqual(["CVE-2026-3", "CVE-2026-2", "CVE-2026-1"]);
    expect(total).toBe(4);
  });
  it("trims each entry to the fields the panel uses", () => {
    const [first] = parseKev({ vulnerabilities: [entry("CVE-2026-1", "2026-10-01", { knownRansomwareCampaignUse: "Known" })] }).items;
    expect(first).toEqual({ cve: "CVE-2026-1", vendor: "Acme", product: "Widget", name: "CVE-2026-1 flaw", added: "2026-10-01", due: "2026-11-20", ransomware: true });
  });
  it("defaults to a bounded list so the 1.8 MB catalog never reaches the browser", () => {
    const feed = { vulnerabilities: Array.from({ length: 100 }, (_, i) => entry(`CVE-2026-${i}`, `2026-09-${String((i % 28) + 1).padStart(2, "0")}`)) };
    expect(parseKev(feed).items).toHaveLength(KEV_LIMIT);
  });
  it("skips entries without a CVE id or a valid date, and tolerates a missing due date", () => {
    const feed = { vulnerabilities: [entry("", "2026-10-01"), entry("CVE-2026-1", "yesterday"), entry("CVE-2026-2", "2026-10-02", { dueDate: undefined })] };
    const { items } = parseKev(feed);
    expect(items.map((i) => i.cve)).toEqual(["CVE-2026-2"]);
    expect(items[0]?.due).toBeNull();
  });
  it("returns nothing for a malformed feed", () => {
    expect(parseKev(null)).toEqual({ items: [], total: 0 });
    expect(parseKev({ vulnerabilities: "nope" })).toEqual({ items: [], total: 0 });
  });
});
