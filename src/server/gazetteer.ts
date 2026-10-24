// Subject-country tagging for headlines. RSS items carry no country field, and
// GDELT's `sourcecountry` is the *publisher's* country — neither says what a
// story is about. This scans title + summary for country names, demonyms and
// capitals and returns the most-mentioned country, keyed by the map's
// topojson name so map, risk index and feed filters all agree.

// topojson name -> extra aliases (the name itself is always an alias).
const ALIASES: Record<string, string[]> = {
  Afghanistan: ["afghan", "kabul", "taliban"],
  Algeria: ["algerian", "algiers"],
  Argentina: ["argentine", "argentinian", "buenos aires"],
  Armenia: ["armenian", "yerevan"],
  Australia: ["australian", "canberra", "sydney", "melbourne"],
  Austria: ["austrian", "vienna"],
  Azerbaijan: ["azerbaijani", "baku"],
  Bangladesh: ["bangladeshi", "dhaka"],
  Belarus: ["belarusian", "minsk"],
  Belgium: ["belgian", "brussels"],
  Bolivia: ["bolivian"],
  "Bosnia and Herz.": ["bosnia", "bosnian", "sarajevo"],
  Brazil: ["brazilian", "brasilia", "sao paulo", "rio de janeiro"],
  Bulgaria: ["bulgarian", "sofia"],
  "Burkina Faso": ["burkinabe", "ouagadougou"],
  Cambodia: ["cambodian", "phnom penh"],
  Cameroon: ["cameroonian"],
  Canada: ["canadian", "ottawa", "toronto"],
  "Central African Rep.": ["central african republic"],
  Chile: ["chilean", "santiago"],
  China: ["chinese", "beijing", "shanghai", "xi jinping"],
  Colombia: ["colombian", "bogota"],
  Croatia: ["croatian", "zagreb"],
  Cuba: ["cuban", "havana"],
  Czechia: ["czech", "czech republic", "prague"],
  "Côte d'Ivoire": ["ivory coast", "cote d'ivoire", "ivorian"],
  "Dem. Rep. Congo": ["democratic republic of the congo", "drc", "kinshasa", "dr congo"],
  Denmark: ["danish", "copenhagen"],
  Ecuador: ["ecuadorian", "quito"],
  Egypt: ["egyptian", "cairo"],
  Eritrea: ["eritrean", "asmara"],
  Estonia: ["estonian", "tallinn"],
  Ethiopia: ["ethiopian", "addis ababa"],
  Finland: ["finnish", "helsinki"],
  France: ["french", "paris", "macron"],
  Germany: ["german", "berlin"],
  Ghana: ["ghanaian", "accra"],
  Greece: ["greek", "athens"],
  Greenland: ["greenlandic", "nuuk"],
  Haiti: ["haitian", "port-au-prince"],
  Hungary: ["hungarian", "budapest"],
  India: [
    "indian", "new delhi", "delhi", "mumbai", "bengaluru", "bangalore", "kolkata", "chennai", "hyderabad", "pune", "ahmedabad", "modi", "bharat",
    "lok sabha", "rajya sabha", "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", "haryana",
    "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland",
    "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
    "jammu and kashmir", "ladakh", "puducherry"
  ],
  Indonesia: ["indonesian", "jakarta"],
  Iran: ["iranian", "tehran"],
  Iraq: ["iraqi", "baghdad"],
  Ireland: ["irish", "dublin"],
  Israel: ["israeli", "jerusalem", "tel aviv", "netanyahu", "idf"],
  Italy: ["italian", "rome"],
  Japan: ["japanese", "tokyo"],
  Jordan: ["jordanian", "amman"],
  Kazakhstan: ["kazakh", "astana"],
  Kenya: ["kenyan", "nairobi"],
  Kosovo: ["kosovar", "pristina"],
  Kuwait: ["kuwaiti"],
  Lebanon: ["lebanese", "beirut", "hezbollah"],
  Libya: ["libyan", "tripoli"],
  Lithuania: ["lithuanian", "vilnius"],
  Macedonia: ["north macedonia", "macedonian", "skopje"],
  Malaysia: ["malaysian", "kuala lumpur"],
  Mali: ["malian", "bamako"],
  Mexico: ["mexican", "mexico city"],
  Moldova: ["moldovan", "chisinau"],
  Mongolia: ["mongolian", "ulaanbaatar"],
  Morocco: ["moroccan", "rabat"],
  Mozambique: ["mozambican", "maputo"],
  Myanmar: ["burma", "burmese", "myanmar's", "naypyidaw", "yangon"],
  Nepal: ["nepali", "nepalese", "kathmandu"],
  Netherlands: ["dutch", "amsterdam", "the hague"],
  "New Zealand": ["new zealander", "wellington", "auckland"],
  Niger: ["nigerien", "niamey"],
  Nigeria: ["nigerian", "abuja", "lagos"],
  "North Korea": ["north korean", "pyongyang", "kim jong un", "dprk"],
  Norway: ["norwegian", "oslo"],
  Pakistan: ["pakistani", "islamabad", "karachi", "lahore"],
  Palestine: ["palestinian", "gaza", "west bank", "hamas", "ramallah"],
  Peru: ["peruvian", "lima"],
  Philippines: ["philippine", "filipino", "manila"],
  Poland: ["polish", "warsaw"],
  Portugal: ["portuguese", "lisbon"],
  Qatar: ["qatari", "doha"],
  Romania: ["romanian", "bucharest"],
  Russia: ["russian", "moscow", "kremlin", "putin"],
  Rwanda: ["rwandan", "kigali"],
  "S. Sudan": ["south sudan", "south sudanese", "juba"],
  "Saudi Arabia": ["saudi", "riyadh"],
  Senegal: ["senegalese", "dakar"],
  Serbia: ["serbian", "belgrade"],
  Slovakia: ["slovak", "bratislava"],
  Somalia: ["somali", "mogadishu", "al-shabaab"],
  "South Africa": ["south african", "pretoria", "johannesburg", "cape town"],
  "South Korea": ["south korean", "seoul"],
  Spain: ["spanish", "madrid"],
  "Sri Lanka": ["sri lankan", "colombo"],
  Sudan: ["sudanese", "khartoum", "darfur"],
  Sweden: ["swedish", "stockholm"],
  Switzerland: ["swiss", "geneva", "zurich", "bern"],
  Syria: ["syrian", "damascus", "aleppo"],
  Taiwan: ["taiwanese", "taipei"],
  Thailand: ["thai", "bangkok"],
  Tunisia: ["tunisian", "tunis"],
  Turkey: ["turkish", "turkiye", "türkiye", "ankara", "istanbul", "erdogan"],
  Uganda: ["ugandan", "kampala"],
  Ukraine: ["ukrainian", "kyiv", "kiev", "zelensky", "zelenskyy", "kharkiv", "odesa"],
  "United Arab Emirates": ["uae", "emirati", "dubai", "abu dhabi"],
  "United Kingdom": ["uk", "britain", "british", "london", "england", "scotland", "wales", "downing street"],
  "United States of America": ["united states", "us", "u.s.", "usa", "american", "washington", "white house", "pentagon", "trump"],
  Venezuela: ["venezuelan", "caracas", "maduro"],
  Vietnam: ["vietnamese", "hanoi"],
  Yemen: ["yemeni", "sanaa", "houthi", "houthis"],
  Zambia: ["zambian", "lusaka"],
  Zimbabwe: ["zimbabwean", "harare"]
};

// Bare country names that need no alias entry.
const PLAIN = [
  "Albania", "Angola", "Bahamas", "Belize", "Benin", "Bhutan", "Botswana", "Brunei", "Burundi", "Chad", "Congo", "Costa Rica", "Cyprus",
  "Djibouti", "El Salvador", "Fiji", "Gabon", "Gambia", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Honduras", "Iceland", "Jamaica",
  "Kyrgyzstan", "Laos", "Latvia", "Lesotho", "Liberia", "Luxembourg", "Madagascar", "Malawi", "Mauritania", "Montenegro", "Namibia",
  "Nicaragua", "Oman", "Panama", "Papua New Guinea", "Paraguay", "Puerto Rico", "Sierra Leone", "Slovenia", "Suriname", "Tajikistan",
  "Tanzania", "Timor-Leste", "Togo", "Trinidad and Tobago", "Turkmenistan", "Uruguay", "Uzbekistan", "Vanuatu", "eSwatini"
];

const aliasToCountry = new Map<string, string>();
for (const name of PLAIN) aliasToCountry.set(name.toLowerCase(), name);
for (const [name, aliases] of Object.entries(ALIASES)) {
  aliasToCountry.set(name.toLowerCase(), name);
  for (const a of aliases) aliasToCountry.set(a, name);
}

// Aliases grouped by first character, longest first, so "papua new guinea" wins over
// "guinea" and "south sudan" over "sudan" at the same position, and each position only
// checks the handful of aliases that could start there.
const aliasesByFirstChar = new Map<string, string[]>();
for (const alias of [...aliasToCountry.keys()].sort((a, b) => b.length - a.length)) {
  const first = alias[0] as string;
  const bucket = aliasesByFirstChar.get(first);
  if (bucket) bucket.push(alias);
  else aliasesByFirstChar.set(first, [alias]);
}

const WORD = /\w/;
const WORD_OR_DOT = /[\w.]/;

/** Lower-cases without ever changing the string's length, so indices still line up with the original. */
const foldCase = (text: string) => Array.from(text, (ch) => (ch.toLowerCase().length === ch.length ? ch.toLowerCase() : ch)).join("");

/**
 * Whole-word alias hits, left to right and non-overlapping. An alias must not be preceded
 * by a letter, digit, underscore or dot, nor followed by a letter, digit or underscore (so
 * "us" doesn't match inside "bus" or "Russia", and "u.s." can still end a sentence).
 * Equivalent to the case-insensitive alternation regex this replaces, but a plain scan: no
 * RegExp is built from data, so no ReDoS surface and nothing for Semgrep to flag.
 */
export const findAliases = (text: string): { alias: string; raw: string }[] => {
  const lower = foldCase(text);
  const hits: { alias: string; raw: string }[] = [];
  let i = 0;
  while (i < lower.length) {
    const bucket = aliasesByFirstChar.get(lower[i] as string);
    let hit: string | undefined;
    if (bucket && (i === 0 || !WORD_OR_DOT.test(lower[i - 1] as string))) {
      hit = bucket.find((alias) => {
        if (!lower.startsWith(alias, i)) return false;
        const next = lower[i + alias.length];
        return next === undefined || !WORD.test(next);
      });
    }
    if (hit) {
      hits.push({ alias: hit, raw: text.slice(i, i + hit.length) });
      i += hit.length;
    } else {
      i++;
    }
  }
  return hits;
};

// Short all-caps tokens are only trusted in their canonical casing ("US", "UK"),
// so the pronoun "us" in "join us" doesn't tag America.
const CASE_SENSITIVE = new Set(["us", "uk", "uae", "drc", "dprk", "idf", "usa"]);

const scan = (text: string, weight: number, scores: Map<string, number>) => {
  for (const { alias, raw } of findAliases(text)) {
    if (CASE_SENSITIVE.has(alias) && raw !== raw.toUpperCase()) continue;
    const country = aliasToCountry.get(alias);
    if (country) scores.set(country, (scores.get(country) ?? 0) + weight);
  }
};

/** Most-mentioned country (title mentions weigh double), or null when none is named. */
export const detectCountry = (title: string, summary = ""): string | null => {
  const scores = new Map<string, number>();
  scan(title, 2, scores);
  scan(summary, 1, scores);
  let best: string | null = null;
  let bestScore = 0;
  for (const [country, score] of scores) {
    if (score > bestScore) {
      best = country;
      bestScore = score;
    }
  }
  return best;
};
