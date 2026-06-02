// AI news briefs (functional port of worldmonitor's AI brief synthesis), using
// Groq's free OpenAI-compatible API. Produces an India brief, a global brief, and
// short per-category digests from the top stories. Falls back to a deterministic
// rule-based digest when GROQ_API_KEY is missing or the call fails/rate-limits.
// Server-side only — the key never reaches the client.
const { labelFor, ALL_CATEGORIES } = require("./categories");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const topHeadlines = (items, n) =>
  items
    .filter((a) => a.title)
    .slice(0, n)
    .map((a) => `- ${a.title}${a.source ? ` (${a.source})` : ""}`)
    .join("\n");

// Deterministic digest used when no LLM is available.
const ruleBasedBriefs = (india, global, byCategory) => {
  const firstTitles = (arr, n = 2) =>
    arr.slice(0, n).map((a) => a.title).filter(Boolean).join(" · ") || "No major stories right now.";
  return {
    source: "rule-based",
    india: firstTitles(india, 3),
    global: firstTitles(global, 3),
    categories: Object.entries(byCategory)
      .map(([key, arr]) => ({ key, label: labelFor(key), text: firstTitles(arr, 1) }))
      .filter((c) => c.text),
    generatedAt: new Date().toISOString()
  };
};

const parseJsonLoose = (text) => {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch (_e2) {
        return null;
      }
    }
    return null;
  }
};

// Generates briefs from the merged, classified news list.
const generateBriefs = async (news = []) => {
  const india = news.filter((n) => n.indiaRelated);
  const global = news.filter((n) => !n.indiaRelated);
  const byCategory = {};
  for (const n of news) {
    const k = n.category || "general";
    (byCategory[k] = byCategory[k] || []).push(n);
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) return ruleBasedBriefs(india, global, byCategory);

  const prompt = [
    "You are a financial/geopolitical news editor for an Indian audience.",
    "Write concise, neutral briefs. Use Indian context where relevant.",
    "",
    "INDIA-RELATED HEADLINES:",
    topHeadlines(india, 18) || "(none)",
    "",
    "GLOBAL HEADLINES:",
    topHeadlines(global, 14) || "(none)",
    "",
    `Categories present: ${[...new Set(news.map((n) => n.category))].map(labelFor).join(", ")}`,
    "",
    'Respond with ONLY JSON: {"india":"2-3 sentence brief","global":"2-3 sentence brief","categories":{"<categoryLabel>":"one-line takeaway"}}'
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You output only valid JSON." },
          { role: "user", content: prompt }
        ]
      })
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const parsed = parseJsonLoose(data?.choices?.[0]?.message?.content);
    if (!parsed) throw new Error("unparseable brief");

    const cats = parsed.categories || {};
    return {
      source: "groq",
      model: GROQ_MODEL,
      india: parsed.india || ruleBasedBriefs(india, global, byCategory).india,
      global: parsed.global || "",
      categories: Object.entries(cats).map(([label, text]) => ({ label, text })),
      generatedAt: new Date().toISOString()
    };
  } catch (_error) {
    // Any failure (no network, rate limit, bad JSON) -> safe deterministic digest.
    return ruleBasedBriefs(india, global, byCategory);
  }
};

module.exports = { generateBriefs };
