// WebGL can't read CSS variables, so deck.gl colours come from the theme mirror
// in src/lib/theme.ts (itself kept in sync with the tokens in app/globals.css).
import { hexToRgb, palette } from "@/lib/theme";

export type RGB = [number, number, number];

export const withAlpha = ([r, g, b]: RGB, a: number): [number, number, number, number] => [r, g, b, Math.round(a * 255)];

/**
 * deck.gl marker colours for a theme. Layer markers use their category colour
 * (violet news, teal quakes, pink disasters, ...), the warm severity ramp is
 * kept for things that are actually dangerous, and blue means "selected".
 */
export const deckColors = (dark: boolean) => {
  const p = palette[dark ? "dark" : "light"];
  const c = p.category;
  return {
    selected: hexToRgb(p.accent),
    news: hexToRgb(c.news),
    quakes: hexToRgb(c.quakes),
    disasters: hexToRgb(c.disasters),
    aircraft: hexToRgb(c.aircraft),
    outages: hexToRgb(c.outages),
    chokepoints: hexToRgb(c.chokepoints),
    media: hexToRgb(c.media),
    /** Flagged-military aircraft and flashpoint areas: high severity, not "severe" red. */
    warning: hexToRgb(p.severity[4]),
    /** Marker outline: the map's label halo, so markers separate from land in both themes. */
    outline: hexToRgb(p.map.labelHalo)
  };
};
