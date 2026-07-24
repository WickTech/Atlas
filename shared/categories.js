// News category taxonomy + classifier (functional port of worldmonitor's
// multi-category news organization). Classifies each article into one category
// using GDELT/Alpha Vantage topic tags first, then keyword matching on the
// title/summary. India-relevant categories are included.

// Ordered by match priority. `key` is stable; `label` is shown in the UI.
const CATEGORIES = [
  { key: "markets", label: "Markets & Economy", keywords: ["stock", "market", "economy", "economic", "gdp", "inflation", "rupee", "sensex", "nifty", "rbi", "trade", "tariff", "fed", "rate", "bond", "currency", "crypto", "bitcoin"] },
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

const DEFAULT_CATEGORY = { key: "general", label: "General" };

// GDELT/AV topic tag -> category key (checked before keyword matching).
const TOPIC_MAP = {
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

// Returns the category key for one article.
const classifyArticle = (article = {}) => {
  for (const t of article.topics || []) {
    const mapped = TOPIC_MAP[String(t).toLowerCase()];
    if (mapped) return mapped;
  }
  const hay = `${article.title || ""} ${article.summary || ""}`.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((k) => hay.includes(k))) return cat.key;
  }
  return DEFAULT_CATEGORY.key;
};

const ALL_CATEGORIES = [...CATEGORIES.map(({ key, label }) => ({ key, label })), DEFAULT_CATEGORY];
const labelFor = (key) => ALL_CATEGORIES.find((c) => c.key === key)?.label || "General";

module.exports = { classifyArticle, ALL_CATEGORIES, labelFor, DEFAULT_CATEGORY };
