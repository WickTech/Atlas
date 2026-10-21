// WebGL can't read CSS variables, so map colors are mirrored here as RGB.
// Keep in sync with the tokens in app/globals.css.
export type RGB = [number, number, number];

export const ACCENT: RGB = [236, 48, 19];
export const AMBER: RGB = [224, 149, 42];
export const INK: RGB = [32, 30, 29];
export const PAPER: RGB = [248, 244, 244];

export const withAlpha = ([r, g, b]: RGB, a: number): [number, number, number, number] => [r, g, b, Math.round(a * 255)];
