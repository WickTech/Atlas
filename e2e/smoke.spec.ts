import { expect, test } from "@playwright/test";

test.describe("console smoke", () => {
  test("health endpoint responds", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBe(true);
    expect(await res.json()).toEqual({ status: "ok" });
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
