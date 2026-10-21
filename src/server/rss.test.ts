import { describe, expect, it } from "vitest";

import { detectCountry } from "./gazetteer";
import { parseFeed } from "./rss";

const RSS = `<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>T</title>
<item><title>Kyiv hit by drones &amp; missiles</title><link>https://ex.com/a</link><pubDate>Wed, 21 Oct 2026 08:00:00 GMT</pubDate>
<description><![CDATA[<p>Ukrainian officials said <b>Russian</b> strikes...</p>]]></description><media:content url="https://ex.com/a.jpg" medium="image"/></item>
<item><title></title><link>https://ex.com/empty</link></item>
<item><title>No link</title></item>
</channel></rss>`;

const SINGLE = `<rss><channel><item><title>Only one</title><link>https://ex.com/one</link></item></channel></rss>`;

const RDF = `<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel><title>DW</title></channel><item><title>Sensex rallies as RBI holds rates</title><link>https://dw.com/x</link><dc:date>2026-10-21T17:55:30Z</dc:date></item></rdf:RDF>`;

const ATOM = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Atom story</title><link rel="alternate" href="https://ex.com/atom"/><updated>2026-10-21T10:00:00Z</updated><summary>In Nairobi today</summary></entry></feed>`;

describe("parseFeed", () => {
  it("parses RSS 2.0 items, decodes entities, strips html, extracts media", () => {
    const [a, ...rest] = parseFeed(RSS, "Ex");
    expect(rest).toHaveLength(0); // empty title + missing link dropped
    expect(a?.title).toBe("Kyiv hit by drones & missiles");
    expect(a?.summary).toBe("Ukrainian officials said Russian strikes...");
    expect(a?.bannerImage).toBe("https://ex.com/a.jpg");
    expect(a?.timePublished).toBe("2026-10-21T08:00:00.000Z");
    expect(a?.country).toBe("Ukraine");
    expect(a?.provider).toBe("RSS");
    expect(a?.sourceDomain).toBe("ex.com");
  });

  it("handles single-item channels, RDF and Atom", () => {
    expect(parseFeed(SINGLE, "S")).toHaveLength(1);
    const [r] = parseFeed(RDF, "DW");
    expect(r?.indiaRelated).toBe(true);
    expect(r?.timePublished).toBe("2026-10-21T17:55:30.000Z");
    const [at] = parseFeed(ATOM, "A");
    expect(at?.url).toBe("https://ex.com/atom");
    expect(at?.country).toBe("Kenya");
  });

  it("applies a national desk's default country only when none is named", () => {
    const xml = `<rss><channel><item><title>Local polls announced</title><link>https://ex.com/p</link></item><item><title>Talks in Moscow</title><link>https://ex.com/m</link></item></channel></rss>`;
    const [a, b] = parseFeed(xml, "Desk", "India");
    expect(a?.country).toBe("India");
    expect(a?.indiaRelated).toBe(true);
    expect(b?.country).toBe("Russia");
  });

  it("returns [] for non-feed or malformed xml", () => {
    expect(parseFeed("<html><body>nope</body></html>", "X")).toEqual([]);
    expect(parseFeed("", "X")).toEqual([]);
  });
});

describe("detectCountry", () => {
  it("prefers the most-mentioned country, title weighted double", () => {
    expect(detectCountry("Modi meets Biden in Washington", "Indian delegation in New Delhi talks")).toBe("India");
    expect(detectCountry("Gaza ceasefire talks", "")).toBe("Palestine");
  });
  it("prefers longest alias at a position", () => {
    expect(detectCountry("South Sudan floods displace thousands")).toBe("S. Sudan");
    expect(detectCountry("Papua New Guinea quake")).toBe("Papua New Guinea");
  });
  it("only trusts short acronyms in caps", () => {
    expect(detectCountry("Join us for the summit")).toBeNull();
    expect(detectCountry("US imposes new tariffs")).toBe("United States of America");
    expect(detectCountry("U.S. imposes new tariffs")).toBe("United States of America");
  });
  it("maps Indian states to India", () => {
    expect(detectCountry("Kerala launches mussel farming unit")).toBe("India");
  });
  it("returns null when no country is named", () => {
    expect(detectCountry("Markets close mixed")).toBeNull();
  });
});
