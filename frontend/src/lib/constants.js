// Small client-side constants. (The shared/ data layer is CommonJS/server-side,
// so the frontend keeps its own copies of the few values it needs.)
export const INDIA = "India";

// Modernist DS has no amber/warning role by default — this is the handoff's
// pragmatic addition, kept consistent with the DC reference (`T.amber`).
export const AMBER = "#e0952a";

// Country lenses: World/Finance/Commodity/Energy — see Dashboard.jsx for wiring.
export const LENSES = ["World", "Finance", "Commodity", "Energy"];

// A short handful of manual overrides for common countries whose ISO-2 code
// isn't just the first two letters; falls back to name.slice(0, 2) otherwise.
const CODE_OVERRIDES = {
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
  Sudan: "SD"
};

export const countryCode = (name) => CODE_OVERRIDES[name] || (name || "").slice(0, 2).toUpperCase();
