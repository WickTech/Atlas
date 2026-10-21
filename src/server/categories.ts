// News category taxonomy + classifier (functional port of worldmonitor's
// multi-category news organization). Classifies each article into one category
// using GDELT/Alpha Vantage topic tags first, then keyword matching on the
// title/summary.
import type { Article, Category } from "@/types/metrics";

interface CategoryDef extends Category {
  keywords: string[];
}

// Ordered by match priority. `key` is stable; `label` is shown in the UI.
const CATEGORIES: CategoryDef[] = [
  { key: "markets", label: "Markets & Economy", keywords: ["stock", "market", "economy", "economic", "gdp", "inflation", "rupee", "sensex", "nifty", "rbi", "trade", "tariff", "fed", "rate", "bond", "currency"] },
  { key: "business", label: "Business & Corporate", keywords: ["earnings", "ipo", "merger", "acquisition", "ceo", "corporate", "company", "layoffs", "revenue", "profit", "quarterly results", "shareholder", "startup funding", "conglomerate"] },
  { key: "politics", label: "Politics & Elections", keywords: ["election", "minister", "parliament", "government", "modi", "party", "campaign", "poll", "cabinet", "opposition", "voting", "ballot", "lok sabha", "rajya sabha", "chief minister", "president", "prime minister"] },
  { key: "geopolitics", label: "Geopolitics", keywords: ["diplomatic", "border", "sanction", "treaty", "summit", "china", "pakistan", "united nations", "g20", "bilateral", "embassy", "foreign policy"] },
  { key: "defense", label: "Defense & Security", keywords: ["military", "army", "navy", "air force", "missile", "defense", "defence", "war", "troops", "terror", "attack", "strike", "drone", "weapon", "ceasefire"] },
  { key: "energy", label: "Energy", keywords: ["oil", "gas", "crude", "opec", "energy", "power", "electricity", "solar", "renewable", "coal", "petrol", "diesel", "pipeline", "nuclear"] },
  { key: "technology", label: "Technology", keywords: ["tech", "ai", "artificial intelligence", "software", "chip", "semiconductor", "startup", "google", "apple", "microsoft", "infosys", "data", "cyber", "internet", "app"] },
  { key: "climate", label: "Disasters & Climate", keywords: ["climate", "flood", "cyclone", "earthquake", "heatwave", "monsoon", "drought", "wildfire", "storm", "disaster", "rain", "pollution", "emission"] },
  { key: "health", label: "Health", keywords: ["health", "hospital", "virus", "covid", "disease", "vaccine", "outbreak", "medical", "dengue", "drug"] },
  { key: "sports", label: "Sports", keywords: ["cricket", "ipl", "olympic", "football", "match", "tournament", "bcci", "kohli", "fifa", "world cup", "hockey"] },
  { key: "society", label: "Society", keywords: ["protest", "court", "crime", "education", "festival", "religion", "caste", "labour", "migrant", "culture"] }
];

export const DEFAULT_CATEGORY: Category = { key: "general", label: "General" };

// GDELT/AV topic tag -> category key (checked before keyword matching).
const TOPIC_MAP: Record<string, string> = {
  economy_macro: "markets",
  economy_monetary: "markets",
  financial_markets: "markets",
  finance: "markets",
  technology: "technology",
  ipo: "business",
  earnings: "business",
  energy_transportation: "energy",
  manufacturing: "markets",
  life_sciences: "health",
  real_estate: "markets"
};

// Word-boundary match so short keywords ("ai", "app", "war") don't fire on
// substrings ("said", "happen", "software").
const keywordRes = new Map(
  CATEGORIES.map((c) => [
    c.key,
    new RegExp(`\\b(${c.keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "i")
  ])
);

/** Returns the category key for one article. */
export const classifyArticle = (article: Pick<Article, "title" | "summary" | "topics">): string => {
  for (const t of article.topics ?? []) {
    const mapped = TOPIC_MAP[String(t).toLowerCase()];
    if (mapped) return mapped;
  }
  const hay = `${article.title ?? ""} ${article.summary ?? ""}`;
  for (const cat of CATEGORIES) {
    if (keywordRes.get(cat.key)?.test(hay)) return cat.key;
  }
  return DEFAULT_CATEGORY.key;
};

export const ALL_CATEGORIES: Category[] = [
  ...CATEGORIES.map(({ key, label }) => ({ key, label })),
  DEFAULT_CATEGORY
];

export const labelFor = (key: string): string =>
  ALL_CATEGORIES.find((c) => c.key === key)?.label ?? "General";
