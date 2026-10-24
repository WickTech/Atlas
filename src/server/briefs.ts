// News briefs (functional port of worldmonitor's AI brief synthesis): an India
// brief, a global brief, and per-category one-liners from the top stories.
// Falls back to a deterministic digest when no LLM provider answers.
import type { Briefs, EnrichedArticle } from "@/types/metrics";

import { labelFor } from "./categories";
import { complete, parseJsonLoose } from "./llm";

const topHeadlines = (items: EnrichedArticle[], n: number) =>
  items
    .filter((a) => a.title)
    .slice(0, n)
    .map((a) => `- ${a.title}${a.source ? ` (${a.source})` : ""}`)
    .join("\n");

const groupByCategory = (news: EnrichedArticle[]) => {
  const byCategory: Record<string, EnrichedArticle[]> = {};
  for (const n of news) (byCategory[n.category] ??= []).push(n);
  return byCategory;
};

export const ruleBasedBriefs = (news: EnrichedArticle[]): Briefs => {
  const firstTitles = (arr: EnrichedArticle[], n = 2) =>
    arr.slice(0, n).map((a) => a.title).filter(Boolean).join(" · ") || "No major stories right now.";
  return {
    source: "rule-based",
    india: firstTitles(news.filter((n) => n.indiaRelated), 3),
    global: firstTitles(news.filter((n) => !n.indiaRelated), 3),
    categories: Object.entries(groupByCategory(news)).map(([key, arr]) => ({ key, label: labelFor(key), text: firstTitles(arr, 1) })),
    generatedAt: new Date().toISOString()
  };
};

export const generateBriefs = async (news: EnrichedArticle[] = [], budgetMs?: number): Promise<Briefs> => {
  const india = news.filter((n) => n.indiaRelated);
  const global = news.filter((n) => !n.indiaRelated);

  const prompt = [
    "You are a financial/geopolitical news editor for an Indian audience.",
    "Write concise, neutral briefs. Use Indian context where relevant. Only use facts present in the headlines.",
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

  const result = await complete({ system: "You output only valid JSON.", prompt, budgetMs });
  const parsed = parseJsonLoose<{ india?: string; global?: string; categories?: Record<string, string> }>(result?.text);
  if (!result || !parsed) return ruleBasedBriefs(news);

  const fallback = ruleBasedBriefs(news);
  return {
    source: result.provider,
    model: result.model,
    india: parsed.india || fallback.india,
    global: parsed.global || fallback.global,
    categories: Object.entries(parsed.categories ?? {}).map(([label, text]) => ({ label, text: String(text) })),
    generatedAt: new Date().toISOString()
  };
};
