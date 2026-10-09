import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/styleguide"]) {
  test(`${path} renders without accessibility violations`, async ({ page }, testInfo) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations).toEqual([]);

    const name = path === "/" ? "home" : path.slice(1);
    await page.screenshot({
      path: `tests/screenshots/latest/smoke-${name}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test(`${path} has no horizontal overflow`, async ({ page }) => {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
