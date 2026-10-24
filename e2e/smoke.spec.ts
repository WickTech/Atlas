import { expect, test } from "@playwright/test";

test.describe("console smoke", () => {
  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("metrics and the AI briefing are separate, and metrics never waits on the model", async ({ request }) => {
    const started = Date.now();
    const metrics = await request.get("/api/metrics");
    expect(metrics.ok()).toBe(true);
    // Cold fan-out is bounded by GDELT's short deadline now, not by the LLM.
    expect(Date.now() - started).toBeLessThan(12_000);
    const body = await metrics.json();
    expect(body.briefs.source).toBe("rule-based");

    const briefing = await request.get("/api/briefing");
    expect(briefing.ok()).toBe(true);
    const briefs = await briefing.json();
    expect(["groq", "openrouter", "rule-based"]).toContain(briefs.source);
    expect(typeof briefs.india).toBe("string");
  });

  test("the Brief tab shows a briefing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("tablist", { name: "Intel panel sections" })).toBeVisible();
    await page.getByRole("tab", { name: /brief/i }).click();
    await expect(page.getByRole("heading", { name: "Today's briefing" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/India brief/)).toBeVisible();
  });

  test("shell renders without uncaught errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(page).toHaveTitle(/Atlas/);
    await expect(page.getByRole("heading", { name: "ATLAS", level: 1 })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Map layers" })).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Intel panel sections" })).toBeVisible();
    // The globe is a lazy chunk; MapLibre mounts a canvas once WebGL is up.
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 45_000 });

    expect(errors).toEqual([]);
  });

  test("deep link restores layers and toggles sync back to the URL", async ({ page }) => {
    await page.goto("/?l=risk,quakes");
    const quakes = page.getByRole("switch", { name: "Earthquakes layer" });
    const flights = page.getByRole("switch", { name: "Aircraft layer" });
    await expect(quakes).toHaveAttribute("aria-checked", "true");
    await expect(flights).toHaveAttribute("aria-checked", "false");

    await quakes.click();
    await expect(quakes).toHaveAttribute("aria-checked", "false");
    await expect(page).toHaveURL(/[?&]l=risk(&|$)/);
  });

  test("command palette loads on demand", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "ATLAS", level: 1 })).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await expect(palette.getByRole("combobox")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(palette).toBeHidden();
  });
});

test.describe("security headers", () => {
  test("every response carries the hardening headers and a CSP", async ({ request }) => {
    for (const path of ["/", "/api/health"]) {
      const h = (await request.get(path)).headers();
      expect(h["x-content-type-options"], path).toBe("nosniff");
      expect(h["x-frame-options"], path).toBe("DENY");
      expect(h["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
      expect(h["content-security-policy"], path).toContain("frame-ancestors 'none'");
    }
  });

  test("the app runs under the CSP with every layer on and nothing is blocked", async ({ page }) => {
    const violations: string[] = [];
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (e) => {
        (window as unknown as { __csp: string[] }).__csp = [...((window as unknown as { __csp?: string[] }).__csp ?? []), `${e.violatedDirective} ${e.blockedURI}`];
      });
    });
    await page.goto("/?l=risk,news,quakes,hazards,flights,cyber,cctv,broadcasts,strategic&v=0,51,5");
    await expect(page.locator(".maplibregl-canvas")).toBeVisible({ timeout: 45_000 });
    await page.waitForTimeout(12_000);
    violations.push(...(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])));
    expect(violations).toEqual([]);
  });
});

test.describe("source health in the layer dock", () => {
  const hazards = (sources: { source: string; ok: boolean; count: number; error?: string }[]) => ({
    items: [
      { id: "eonet:1", kind: "hazard", coord: [10, 10], title: "Test wildfire", ts: null, severity: "medium", source: "NASA EONET", facts: ["x"], category: "wildfires" }
    ],
    sources,
    fetchedAt: new Date().toISOString()
  });

  test("a failed upstream behind a working layer shows as a warning, not a silent 'ready'", async ({ page }) => {
    await page.route("**/api/hazards", (route) =>
      route.fulfill({ json: hazards([{ source: "NASA EONET", ok: true, count: 1 }, { source: "GDACS", ok: false, count: 0, error: "HTTP 503" }]) })
    );
    await page.goto("/?l=hazards");
    await expect(page.getByText("GDACS unavailable — showing NASA EONET only")).toBeVisible({ timeout: 30_000 });
  });

  test("when every upstream behind a layer failed, the layer shows an error", async ({ page }) => {
    await page.route("**/api/hazards", (route) =>
      route.fulfill({ json: { ...hazards([{ source: "NASA EONET", ok: false, count: 0 }, { source: "GDACS", ok: false, count: 0 }]), items: [] } })
    );
    await page.goto("/?l=hazards");
    await expect(page.getByText("NASA EONET and GDACS unavailable — retrying")).toBeVisible({ timeout: 30_000 });
  });

  test("no warning when all sources answered", async ({ page }) => {
    await page.route("**/api/hazards", (route) =>
      route.fulfill({ json: hazards([{ source: "NASA EONET", ok: true, count: 1 }, { source: "GDACS", ok: true, count: 0 }]) })
    );
    await page.goto("/?l=hazards");
    await expect(page.getByRole("switch", { name: "Disasters layer" })).toHaveAttribute("aria-checked", "true");
    await page.waitForTimeout(3000);
    await expect(page.getByText(/unavailable/)).toHaveCount(0);
  });
});
