// Geo helpers shared by the country-risk index (data) and the map (UI). GDELT
// returns full English country names (e.g. "United States"); the world-atlas
// topojson uses slightly different names for a handful of countries. This
// normalization table bridges the two so choropleth fills line up.

// GDELT/source name -> topojson `properties.name` (world-atlas countries-110m).
export const NAME_ALIASES: Record<string, string> = {
  "United States": "United States of America",
  USA: "United States of America",
  "Czech Republic": "Czechia",
  "Republic of Korea": "South Korea",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Republic of the Congo": "Congo",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Dominican Republic": "Dominican Rep.",
  "Myanmar (Burma)": "Myanmar",
  Burma: "Myanmar",
  "Ivory Coast": "Côte d'Ivoire",
  "Cote d'Ivoire": "Côte d'Ivoire",
  "South Sudan": "S. Sudan",
  "North Macedonia": "Macedonia",
  Eswatini: "eSwatini",
  Swaziland: "eSwatini",
  "Central African Republic": "Central African Rep.",
  "Equatorial Guinea": "Eq. Guinea",
  "Western Sahara": "W. Sahara",
  "Solomon Islands": "Solomon Is.",
  "East Timor": "Timor-Leste",
  "Occupied Palestinian Territory": "Palestine",
  "Gaza Strip": "Palestine",
  Turkiye: "Turkey",
  "Türkiye": "Turkey"
};

/** Canonicalize a country name coming from GDELT to the map's topojson name. */
export const normalizeCountryName = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  return NAME_ALIASES[trimmed] ?? trimmed;
};

export const INDIA = "India";
