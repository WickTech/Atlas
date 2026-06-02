// Geo helpers shared by the country-risk index (data) and the India-centered map
// (UI). GDELT returns full English country names (e.g. "United States"); the
// world-atlas topojson used by the map uses slightly different names for a
// handful of countries. This normalization table bridges the two so choropleth
// fills line up. Unmatched countries simply render in the base color.

// GDELT/source name -> topojson `properties.name` (world-atlas countries-110m).
const NAME_ALIASES = {
  "United States": "United States of America",
  USA: "United States of America",
  "United Kingdom": "United Kingdom",
  Russia: "Russia",
  "South Korea": "South Korea",
  "North Korea": "North Korea",
  "Czech Republic": "Czechia",
  "Republic of Korea": "South Korea",
  "Democratic Republic of the Congo": "Dem. Rep. Congo",
  "Republic of the Congo": "Congo",
  Tanzania: "Tanzania",
  "Bosnia and Herzegovina": "Bosnia and Herz.",
  "Dominican Republic": "Dominican Rep.",
  "United Arab Emirates": "United Arab Emirates",
  "Myanmar (Burma)": "Myanmar",
  Burma: "Myanmar",
  Syria: "Syria",
  Laos: "Laos",
  "Ivory Coast": "Côte d'Ivoire",
  "Cote d'Ivoire": "Côte d'Ivoire"
};

// Canonicalize a country name coming from GDELT to the map's topojson name.
const normalizeCountryName = (name) => {
  if (!name) return null;
  const trimmed = String(name).trim();
  return NAME_ALIASES[trimmed] || trimmed;
};

const INDIA = "India";

// South Asian neighbours — used to give the India-centric view regional context.
const SOUTH_ASIA = [
  "India",
  "Pakistan",
  "Bangladesh",
  "Sri Lanka",
  "Nepal",
  "Bhutan",
  "Maldives",
  "Afghanistan",
  "China",
  "Myanmar"
];

// Default map focus (India) — centre lng/lat + zoom for react-simple-maps.
const INDIA_FOCUS = { center: [80, 22], zoom: 3.2 };

module.exports = { normalizeCountryName, INDIA, SOUTH_ASIA, INDIA_FOCUS, NAME_ALIASES };
