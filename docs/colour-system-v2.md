# Atlas UI handoff: colour system v2

**Goal:** make Atlas calmer and easier to read. Colour should only mean something.
**Rule of thumb:** 🔵 blue = you can click it · 🟡→🔴 warm ramp = how bad it is · red = only the worst cases.

Files in this pack:

| File | What it is | Where it goes |
|---|---|---|
| `atlas-theme.css` | All tokens, dark and light | Replace the `:root` / `:root.light` blocks in `globals.css` |
| `atlas-theme.ts` | JS mirror for the map paint (MapLibre can't read CSS variables) | `src/lib/theme.ts` (or wherever shared libs live) |
| `HANDOFF.md` | This file: the problem, the mapping, the steps, a Claude Code prompt | Repo root or `docs/` |

---

## 1. The problem

One red (`#d42a10`) was doing five jobs at once:

1. Brand mark
2. Active tabs, toggles, sliders (the controls you click)
3. The top-signal banner (solid red, full width)
4. Risk shading on the map
5. The "bear" market colour

So everything looked equally urgent. The warm brown-black background also made the map look muddy, and the text colours were transparent white, so their contrast changed depending on the panel behind them.

## 2. The fix in one table

| UI element | Before | After |
|---|---|---|
| Page / panels | `#201e1d` / `#2d2b2b` warm | `--bg #0B0F14` / `--surface #121821` cool slate |
| Body text | `#f8f4f4` | `--fg #E7EDF4` |
| Secondary text | `#f8f4f48c` (alpha) | `--muted #9AA8B8` (solid, 7.4:1) |
| Small labels, keys | `--muted` | `--subtle #7D8B9C` (5.1:1) |
| Active tab, toggle on, slider fill, focus | `--accent` red | `--accent #6E9BFF` blue, text `--on-accent` |
| Threat chip | red outline | `--sev-N` text on `--sev-N-soft` background |
| Top-signal bar | solid red background | `--sev-5-soft` tint, plus a solid `--sev-5` "TOP SIGNAL" pill |
| Country risk scores and bars | red/orange | `severityColor(score)`, the 5-step ramp |
| Map choropleth | red, flat | `riskFillColor()` + `riskFillOpacity()`, so calm regions stay neutral |
| Map land / ocean | `#2d2b2b` / near-black | `--map-land #1B2533` / `--map-ocean #0E1520` |
| Layer dots and markers | mixed warm colours | `--cat-*` (violet, teal, pink, sky, lime) |
| Bull / bear | `#5fd48c` / `#ff9783` | `--bull #3FD69B` / `--bear #FF8A6B`, **always shown with ▲▼** |
| Feed health dots (footer) | various | ok → `--bull`, throttled → `--sev-3`, down → `--sev-5`, no key → `--subtle` |
| Logo dot | red | `--brand-dot` (= `--sev-5`, the only "red" brand touch) |

Severity thresholds (score 0–100): **<20 calm · 20 guarded · 35 elevated · 55 high · 75+ severe**.

## 3. Implementation steps

Each step depends on the one before it.

1. **Tokens**: paste `atlas-theme.css` over the existing `:root, :root.dark` and `:root.light` blocks in `globals.css`. Update `<meta name="theme-color">`: dark `#0B0F14`, light `#F4F6F9`.
2. **Theme lib**: add `atlas-theme.ts`. Remove any local `scoreToColor` helpers and replace them with `severityColor()`.
3. **Find accent misuse**: anywhere `--accent` (or `#d42a10`, `#ec3013`, `#ff9783`) shows *risk or alert* rather than *interaction*, change it to `--sev-*`. To find them:
   ```bash
   grep -rnE "var\(--accent|accent-soft|glow-accent|#d42a10|#ec3013|#ff9783|#e0952a" src/
   ```
   Keep `--accent` on tabs, toggles, sliders, links, focus rings and the active panel buttons.
4. **Top-signal bar**: change the solid red background to `var(--sev-5-soft)`, and make the "TOP SIGNAL" label a pill (`background: var(--sev-5); color: var(--on-sev)`). Headline text uses `--fg` and the metadata uses `--muted`.
5. **Map**: set the background and land paint from `palette[mode].map`. Set the risk layer to `fill-color: riskFillColor(mode)` and `fill-opacity: riskFillOpacity(mode)`. Re-apply both on theme toggle. Marker colours come from `palette[mode].category`.
6. **Layer panel**: the colour dot for each layer comes from `--cat-*` (Regional risk uses `--sev-4`). Toggle on = `--accent` track with an `--on-accent` knob; off = `--surface-3` track with a `--subtle` knob. Turned-off rows show the name in `--muted`.
7. **Markets**: always render ▲/▼ next to bull/bear values, so colour is never the only signal.
8. **Focus**: the global `:focus-visible` ring is included in the CSS. Check that tab order reaches the toggles. Toggles must be `<button role="switch" aria-checked>`, not divs.

## 4. Acceptance checklist

- [ ] With no country above 55, the screen has **no** red or orange except the logo dot.
- [ ] India at 83 is the single most prominent warm element on the map.
- [ ] Active tabs and toggles are blue in both themes, and nothing interactive is red.
- [ ] Light theme: all text passes 4.5:1 (spot-check `--subtle` on `--surface-2`).
- [ ] Theme toggle re-paints the map choropleth and markers without a reload.
- [ ] Bull/bear values show arrows.
- [ ] Phone width (390px): panels stack and the top bar wraps without horizontal scroll.
- [ ] Checked in the real app (Vercel preview), not only locally.

## 5. Prompt for Claude Code

> Read `docs/HANDOFF.md`, `atlas-theme.css` and `atlas-theme.ts`. Apply steps 1–8 in order. Change colour usage only: no layout or logic changes. Use `--accent` only for interactive states and `--sev-*` / `severityColor()` for anything risk-related. When done, run the grep in step 3 and confirm that no risk-related usage of `--accent` remains. Then run the build and list the changed files with [file:line] refs.

Suggested commit:
```
style(theme): cool slate ground, blue interaction accent, 5-step severity ramp

- replace :root tokens (dark + light) with colour system v2
- add theme.ts (severityColor, MapLibre risk expressions)
- move risk/alert UI from --accent to --sev-*
- top-signal bar: tinted instead of solid red
```

## 6. Reference

Visual reference: the "Atlas — Colour Revamp" Design canvas (token sheet plus the dark and light console mockups). The land shapes on the mockup map are placeholders; the real app keeps its OpenFreeMap basemap.
