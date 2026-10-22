// WebGL can't read CSS variables, so map colors are mirrored here as RGB.
// Keep in sync with the tokens in app/globals.css.
export type RGB = [number, number, number];

export const ACCENT: RGB = [236, 48, 19];
export const AMBER: RGB = [224, 149, 42];
export const INK: RGB = [32, 30, 29];
export const PAPER: RGB = [248, 244, 244];

export const withAlpha = ([r, g, b]: RGB, a: number): [number, number, number, number] => [r, g, b, Math.round(a * 255)];

export const QUAKE_SHALLOW: RGB = [255, 107, 61];
export const QUAKE_DEEP: RGB = [224, 149, 42];
export const SKY: RGB = [127, 209, 255];
export const MILITARY: RGB = [236, 48, 19];
export const VIOLET: RGB = [180, 140, 255];
export const GREEN: RGB = [95, 212, 140];
export const STEEL: RGB = [154, 165, 177];

/** Hazard category -> color (EONET category ids; GDACS types mapped onto them). */
export const HAZARD_COLORS: Record<string, RGB> = {
  wildfires: [255, 99, 51],
  severeStorms: [95, 170, 255],
  volcanoes: [200, 40, 40],
  floods: [60, 130, 230],
  earthquakes: [255, 107, 61],
  drought: [200, 160, 90],
  tsunami: [40, 200, 220],
  landslides: [160, 110, 70],
  dustHaze: [210, 190, 140],
  snow: [220, 230, 240],
  tempExtremes: [255, 160, 60]
};
export const HAZARD_DEFAULT: RGB = [224, 149, 42];
