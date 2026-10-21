// Keyless news backbone: public publisher RSS/RDF/Atom feeds, fetched in
// parallel behind the metrics cache. Unlike GDELT's DOC API (1 req / 5 s per
// IP — effectively always exhausted from shared serverless egress) these are
// static CDN-served files with no per-IP quota. Every feed self-falls-back.
import { XMLParser } from "fast-xml-parser";

import type { Article } from "@/types/metrics";

import { fetchWithTimeout, USER_AGENT } from "./fetchWithTimeout";
import { detectCountry } from "./gazetteer";
import { isIndiaRelated } from "./gdelt";

export interface FeedDef {
  url: string;
  source: string;
  /** National-desk feeds: stories naming no country are about this one. */
  defaultCountry?: string;
}

// India-first mix plus global wires. Publisher-hosted, free to syndicate as
// headline + link (we never republish full text).
export const FEEDS: FeedDef[] = [
  { url: "https://www.thehindu.com/news/national/feeder/default.rss", source: "The Hindu", defaultCountry: "India" },
  { url: "https://www.thehindu.com/news/international/feeder/default.rss", source: "The Hindu" },
  { url: "https://feeds.feedburner.com/ndtvnews-world-news", source: "NDTV" },
  { url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", source: "Times of India" },
  { url: "https://www.livemint.com/rss/news", source: "Mint" },
  { url: "https://economictimes.indiatimes.com/rssfeedstopstories.cms", source: "Economic Times" },
  { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC News" },
  { url: "https://www.aljazeera.com/xml/rss/all.xml", source: "Al Jazeera" },
  { url: "https://rss.dw.com/rdf/rss-en-world", source: "DW" },
  { url: "https://www.france24.com/en/rss", source: "France 24" },
  { url: "https://www.theguardian.com/world/rss", source: "The Guardian" },
  { url: "https://feeds.npr.org/1004/rss.xml", source: "NPR" },
  { url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", source: "UN News" }
];

const PER_FEED = 25;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@",
  // Keep repeated elements as arrays so single-item feeds parse the same way.
  isArray: (name) => ["item", "entry", "media:content", "media:thumbnail", "link"].includes(name),
  processEntities: true,
  htmlEntities: true
});

type Node = Record<string, unknown>;

const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as Node)) return String((v as Node)["#text"]);
  return "";
};

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const linkOf = (item: Node): string => {
  const links = item.link as unknown[] | undefined;
  if (!links?.length) return text(item.guid);
  // Atom: <link rel="alternate" href="..."/>; RSS: <link>url</link>
  for (const l of links) {
    if (typeof l === "string") return l.trim();
    const n = l as Node;
    if (n["@href"] && (!n["@rel"] || n["@rel"] === "alternate")) return String(n["@href"]);
  }
  return text(links[0]);
};

const imageOf = (item: Node): string | null => {
  for (const key of ["media:content", "media:thumbnail"]) {
    const arr = item[key] as Node[] | undefined;
    const url = arr?.find((m) => m["@url"])?.["@url"];
    if (url) return String(url);
  }
  const enc = item.enclosure as Node | undefined;
  if (enc?.["@url"] && String(enc["@type"] ?? "image").startsWith("image")) return String(enc["@url"]);
  return null;
};

const dateOf = (item: Node): string | null => {
  const raw = text(item.pubDate) || text(item["dc:date"]) || text(item.updated) || text(item.published);
  const t = Date.parse(raw);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
};

/** Parses RSS 2.0, RSS 1.0 (RDF) and Atom into Articles. Exported for tests. */
export const parseFeed = (xml: string, source: string, defaultCountry?: string): Article[] => {
  const doc = parser.parse(xml) as Node;
  const rss = doc.rss as Node | undefined;
  const items =
    ((rss?.channel as Node | undefined)?.item as Node[] | undefined) ??
    ((doc["rdf:RDF"] as Node | undefined)?.item as Node[] | undefined) ??
    ((doc.feed as Node | undefined)?.entry as Node[] | undefined) ??
    [];

  return items.slice(0, PER_FEED).flatMap((item): Article[] => {
    const title = stripHtml(text(item.title));
    const url = linkOf(item);
    if (!title || !/^https?:\/\//.test(url)) return [];
    const summary = stripHtml(text(item.description) || text(item.summary) || text(item["content:encoded"])).slice(0, 400);
    const country = detectCountry(title, summary) ?? defaultCountry ?? null;
    let domain: string | null = null;
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // keep null
    }
    return [
      {
        title,
        url,
        source,
        sourceDomain: domain,
        timePublished: dateOf(item),
        summary,
        bannerImage: imageOf(item),
        sentimentScore: null,
        sentimentLabel: "Neutral",
        topics: [],
        tickerSentiment: [],
        country,
        indiaRelated: isIndiaRelated({ title, summary, country }),
        provider: "RSS"
      }
    ];
  });
};

const fetchFeed = async ({ url, source, defaultCountry }: FeedDef): Promise<Article[]> => {
  try {
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml" } }, 6000);
    if (!res.ok) return [];
    return parseFeed(await res.text(), source, defaultCountry);
  } catch {
    return [];
  }
};

export const fetchRssNews = async (feeds: FeedDef[] = FEEDS): Promise<Article[]> => (await Promise.all(feeds.map(fetchFeed))).flat();
