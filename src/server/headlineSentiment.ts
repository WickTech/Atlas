// Headline-wording sentiment: a small, transparent word-list scorer used for articles that
// arrive without a sentiment score (all publisher-RSS items). Alpha Vantage's per-article
// NEWS_SENTIMENT is a premium endpoint ("This is a premium endpoint" on free keys), so
// without this the Market Mood gauge has nothing to average. It is deliberately simple and is
// always labelled as "from headline wording", never presented as model-grade analysis.

const POSITIVE = [
  "surge", "soar", "rally", "gain", "jump", "rise", "rose", "climb", "record", "growth", "boost", "beat", "strong", "stronger", "recover", "recovery",
  "profit", "win", "won", "success", "successful", "approve", "approval", "agreement", "deal", "breakthrough", "improve", "improvement", "upgrade",
  "optimism", "optimistic", "relief", "peace", "ceasefire", "rescue", "safe", "safely", "resolve", "resolved", "welcome", "praise", "honour", "honor",
  "launch", "unveil", "expand", "expansion", "invest", "investment", "hire", "hiring", "cut", "relief", "ease", "boom", "milestone", "victory",
  "celebrate", "support", "funding", "grant", "award", "inaugurate", "revive", "resume", "stabilise", "stabilize", "upbeat", "bullish", "cheer"
];

const NEGATIVE = [
  "crash", "plunge", "fall", "fell", "drop", "slump", "loss", "lose", "lost", "fear", "war", "attack", "kill", "killed", "dead", "death", "die", "died",
  "crisis", "collapse", "fraud", "scam", "ban", "arrest", "protest", "strike", "shutdown", "recession", "inflation", "default", "bankrupt", "bankruptcy",
  "layoff", "sanction", "threat", "threaten", "explosion", "blast", "flood", "earthquake", "fire", "injure", "injured", "conflict", "tension", "warn",
  "decline", "slide", "tumble", "sink", "weak", "weaker", "worst", "violence", "riot", "clash", "terror", "terrorist", "missile", "bomb", "hostage",
  "shortage", "outage", "breach", "hack", "leak", "scandal", "probe", "raid", "charged", "convicted", "jail", "sentence", "accuse", "allege", "denies",
  "disaster", "cyclone", "storm", "drought", "famine", "outbreak", "epidemic", "pandemic", "cancel", "delay", "reject", "denied", "bearish", "slashed",
  "toll", "victim", "crime", "murder", "rape", "abuse", "corruption", "evict", "demolish", "devastate", "devastating", "tragedy", "mourn"
];

const NEGATORS = new Set(["not", "no", "never", "without", "cannot", "can't", "won't", "isn't", "wasn't", "aren't", "fails", "failed", "fail", "lack", "lacks", "denied"]);

const POS = new Set(POSITIVE);
const NEG = new Set(NEGATIVE);

/** Maps an inflected token onto the list form: "surges", "surged", "surging", "rallies" -> "surge", "rally". */
const base = (word: string): string => {
  if (POS.has(word) || NEG.has(word)) return word;
  const candidates = [
    word.replace(/ies$/, "y"),
    word.replace(/ing$/, ""),
    word.replace(/ing$/, "e"),
    word.replace(/ed$/, ""),
    word.replace(/ed$/, "e"),
    word.replace(/es$/, ""),
    word.replace(/s$/, ""),
    word.replace(/([a-z])\1(ing|ed)$/, "$1") // "dropped" -> "drop"
  ];
  return candidates.find((c) => c !== word && (POS.has(c) || NEG.has(c))) ?? word;
};

const TOKEN = /[a-z']+/g;

/** The default smoothing keeps one loaded word from reading as an extreme. */
const SMOOTHING = 4;

export interface HeadlineScore {
  /** -1..1, same scale and thresholds as Alpha Vantage (>=0.15 bullish, <=-0.15 bearish). */
  score: number;
  positive: number;
  negative: number;
}

/** Null when the text contains no word from either list (so it is left out of averages, not counted as 0). */
export const scoreHeadline = (text: string): HeadlineScore | null => {
  const tokens = text.toLowerCase().match(TOKEN) ?? [];
  let positive = 0;
  let negative = 0;
  tokens.forEach((token, i) => {
    const word = base(token);
    const sign = POS.has(word) ? 1 : NEG.has(word) ? -1 : 0;
    if (!sign) return;
    // "not strong", "no deal": a negator in the two words before flips the word.
    const negated = NEGATORS.has(tokens[i - 1] ?? "") || NEGATORS.has(tokens[i - 2] ?? "");
    if ((sign === 1) !== negated) positive += 1;
    else negative += 1;
  });
  if (!positive && !negative) return null;
  return { score: Number(((positive - negative) / (positive + negative + SMOOTHING)).toFixed(3)), positive, negative };
};
