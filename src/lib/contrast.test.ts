import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Token-level WCAG check, independent of live data. The e2e axe tests only see whichever
// severity states today's feed happens to produce (a "HIGH" threat chip appeared one day and
// failed CI), so this verifies every severity step against every ground it can sit on.
const css = readFileSync(new URL("../../app/globals.css", import.meta.url), "utf8");

const block = (start: string) => {
  const i = css.indexOf(start);
  return css.slice(i, css.indexOf("\n}", i));
};
const tokens = (b: string) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1] as string, m[2] as string]));
const themes = { dark: tokens(block(":root.dark {")), light: tokens(block(":root.light {")) };

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const lum = (hex: string) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const tint = (fg: string, bg: string, alpha: number) => {
  const f = rgb(fg);
  const b = rgb(bg);
  return `#${f.map((v, i) => Math.round(v * alpha + (b[i] as number) * (1 - alpha)).toString(16).padStart(2, "0")).join("")}`;
};

describe.each(["dark", "light"] as const)("%s theme tokens", (mode) => {
  const t = themes[mode];
  const grounds = ["bg", "surface", "surface-2"].map((k) => [k, t[k] as string] as const);

  it("parsed every token it needs", () => {
    for (const k of ["bg", "surface", "surface-2", "fg", "muted", "subtle", "accent", "on-accent", "on-sev", "bull", "bear", ...[1, 2, 3, 4, 5].flatMap((n) => [`sev-${n}`, `sev-${n}-text`])]) {
      expect(t[k], k).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it.each([1, 2, 3, 4, 5])("severity step %i text is AA on every surface and on its own chip tint", (n) => {
    const text = t[`sev-${n}-text`] as string;
    const fill = t[`sev-${n}`] as string;
    for (const [name, ground] of grounds) {
      expect(ratio(text, ground), `sev-${n}-text on ${name}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(text, tint(fill, ground, 0.14)), `sev-${n}-text on 14% tint over ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([1, 2, 3, 4, 5])("severity step %i fill passes 3:1 as a non-text mark on the page background", (n) => {
    expect(ratio(t[`sev-${n}`] as string, t.bg as string)).toBeGreaterThanOrEqual(3);
  });

  it("the pill text (on-sev) is AA on the severe fill", () => {
    expect(ratio(t["on-sev"] as string, t["sev-5"] as string)).toBeGreaterThanOrEqual(4.5);
  });

  it("body, secondary and small-label text are AA on every surface", () => {
    for (const k of ["fg", "muted", "subtle", "bull", "bear"]) {
      for (const [name, ground] of grounds) expect(ratio(t[k] as string, ground), `${k} on ${name}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("text on the accent fill is AA", () => {
    expect(ratio(t["on-accent"] as string, t.accent as string)).toBeGreaterThanOrEqual(4.5);
  });
});
