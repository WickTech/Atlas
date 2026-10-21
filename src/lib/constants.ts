export const INDIA = "India";

// Lenses: World/Finance/Commodity/Energy — wired to real news/instrument filters.
export const LENSES = ["World", "Finance", "Commodity", "Energy"] as const;
export type Lens = (typeof LENSES)[number];

// Lens -> forced news category. World has no forced filter; Commodity has no
// dedicated news category so it falls back to Markets (closest real mapping).
export const LENS_CATEGORY: Partial<Record<Lens, string>> = { Finance: "markets", Commodity: "markets", Energy: "energy" };

export type Scope = "india" | "world";

// Manual overrides for countries whose ISO-2 code isn't the first two letters.
const CODE_OVERRIDES: Record<string, string> = {
  "United States": "US",
  "United States of America": "US",
  "United Kingdom": "UK",
  "United Arab Emirates": "AE",
  Russia: "RU",
  Israel: "IL",
  Iran: "IR",
  China: "CN",
  India: "IN",
  Pakistan: "PK",
  Taiwan: "TW",
  "South Korea": "KR",
  "North Korea": "KP",
  Ukraine: "UA",
  Germany: "DE",
  France: "FR",
  Japan: "JP",
  Brazil: "BR",
  Egypt: "EG",
  "Saudi Arabia": "SA",
  Turkey: "TR",
  Sudan: "SD",
  Austria: "AT",
  Australia: "AU",
  Switzerland: "CH",
  Spain: "ES",
  Sweden: "SE",
  Poland: "PL",
  Portugal: "PT",
  Mexico: "MX",
  Malaysia: "MY",
  Singapore: "SG",
  Nigeria: "NG",
  Bangladesh: "BD",
  "Sri Lanka": "LK",
  "South Africa": "ZA"
};

export const countryCode = (name: string) => CODE_OVERRIDES[name] ?? name.slice(0, 2).toUpperCase();
