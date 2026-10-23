import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// WCAG AA contrast guard for both themes, every intel tab, and the overlays
// that only render on interaction (inspector, command palette).
const contrast = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  return violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")} — ${n.any[0]?.message ?? v.help}`));
};

for (const scheme of ["light", "dark"] as const) {
  test.describe(`color contrast (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test("intel panel tabs", async ({ page }) => {
      await page.goto("/?l=risk,news,quakes,hazards,strategic");
      await expect(page.getByRole("tablist", { name: "Intel panel sections" })).toBeVisible();
      await expect(page.getByRole("status").first()).toBeVisible();
      for (const tab of ["Intel", "Markets", "News", "Brief"]) {
        await page.getByRole("tab", { name: new RegExp(tab, "i") }).click();
        await expect(page.getByRole("tab", { name: new RegExp(tab, "i") })).toHaveAttribute("aria-selected", "true");
        expect(await contrast(page), `${tab} tab`).toEqual([]);
      }
    });

    test("inspector and command palette", async ({ page }) => {
      await page.goto("/?l=risk,news&c=India");
      await expect(page.getByRole("complementary", { name: /inspector/i })).toBeVisible({ timeout: 30_000 });
      expect(await contrast(page), "inspector").toEqual([]);
      await page.keyboard.press("ControlOrMeta+k");
      await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
      expect(await contrast(page), "palette").toEqual([]);
    });

    test("all layers on, help overlay and mobile layout", async ({ page }) => {
      await page.goto("/?l=risk,news,quakes,hazards,flights,cyber,cctv,broadcasts,strategic");
      await expect(page.getByRole("complementary", { name: "Map layers" })).toBeVisible();
      expect(await contrast(page), "layer dock").toEqual([]);
      await page.keyboard.press("?");
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await contrast(page), "help").toEqual([]);
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 390, height: 844 });
      await expect(page.getByRole("heading", { name: "ATLAS", level: 1 })).toBeVisible();
      expect(await contrast(page), "mobile").toEqual([]);
    });
  });
}
