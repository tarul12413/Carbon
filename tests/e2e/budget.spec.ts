import { expect, test } from "@playwright/test";

const HOME_JS_BUDGET_BYTES = 170 * 1024;
/** Lets late hydration chunks arrive; the page has no long-polling. */
const SETTLE_MS = 1500;

test.describe("home performance budget", () => {
  test.skip(({ isMobile }) => !isMobile, "measured on phone and tablet viewports only");

  test("initial JavaScript stays under 170 KB gzipped and GSAP waits for the first scroll", async ({ page }) => {
    const scripts = new Map<string, number>();
    page.on("requestfinished", async (request) => {
      if (request.resourceType() !== "script") return;
      const sizes = await request.sizes();
      scripts.set(request.url(), sizes.responseBodySize);
    });

    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(SETTLE_MS);
    const initial = [...scripts.values()].reduce((sum, size) => sum + size, 0);
    test.info().annotations.push({ type: "home-js-gzip-kb", description: (initial / 1024).toFixed(1) });
    expect(initial).toBeLessThanOrEqual(HOME_JS_BUDGET_BYTES);

    const before = scripts.size;
    await page.mouse.wheel(0, 600);
    await expect.poll(() => scripts.size).toBeGreaterThan(before);
  });
});
