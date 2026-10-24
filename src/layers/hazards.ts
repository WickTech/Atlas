// Disaster markers share one hue (the "disasters" category colour) so the palette stays
// calm; the *kind* of event is carried by marker style instead.
export type HazardStyle = "heat" | "water" | "ground";

const HEAT = new Set(["wildfires", "volcanoes", "tempExtremes", "drought"]);
const WATER = new Set(["floods", "severeStorms", "tsunami", "snow"]);

/**
 * heat   -> solid disc   (fire, volcano, heatwave, drought)
 * water  -> hollow ring  (flood, storm, tsunami, snow)
 * ground -> soft disc    (earthquake alert, landslide, dust/haze, anything else)
 * Categories are EONET ids; GDACS types are mapped onto the same ids server-side.
 */
export const hazardStyle = (category: string | undefined): HazardStyle => (HEAT.has(category ?? "") ? "heat" : WATER.has(category ?? "") ? "water" : "ground");

export const HAZARD_STYLE_LABEL: Record<HazardStyle, string> = {
  heat: "solid = fire / heat",
  water: "ring = water / storm",
  ground: "soft = ground / other"
};
