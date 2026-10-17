import { expect, test, type Page } from "@playwright/test";

/*
 * Interaction to Next Paint (brief: 200 ms or less), measured in the browser with the Event Timing
 * API while the CPU runs 4x slower, standing in for a mid-range phone. INP is the slowest
 * interaction here (fewer than 50 interactions per page, so no outlier is dropped).
 */

const INP_BUDGET_MS = 200;

async function slowPhone(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => {
    const w = window as unknown as { __events: { name: string; duration: number }[] };
    w.__events = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as (PerformanceEntry & { interactionId?: number })[]) {
        if (e.interactionId) w.__events.push({ name: e.name, duration: e.duration });
      }
    }).observe({ type: "event", buffered: true, durationThreshold: 16 } as PerformanceObserverInit);
  });
}

const slowest = async (page: Page) => {
  const events = await page.evaluate(
    () => (window as unknown as { __events: { name: string; duration: number }[] }).__events,
  );
  console.log(JSON.stringify(events.map((e) => `${e.name}:${Math.round(e.duration)}`)));
  return events.reduce((worst, e) => (e.duration > worst.duration ? e : worst), { name: "none", duration: 0 });
};

test.describe("INP", () => {
  test.skip(({ isMobile }) => !isMobile, "measured on the phone and tablet projects");

  test("menu: search, filters and views respond within 200 ms", async ({ page }) => {
    test.slow();
    await slowPhone(page);
    await page.goto("/menu", { waitUntil: "networkidle" });
    /* A settled page: the visitor reads the screen before the first tap (the mock backend loads at idle). */
    await page.waitForTimeout(2000);
    await page.getByLabel("Search the menu").pressSequentially("cold", { delay: 80 });
    await page.getByLabel("Search the menu").fill("");
    await page.getByRole("button", { name: "Cold brew", exact: true }).click();
    await page.getByRole("button", { name: "Food", exact: true }).click();
    await page.getByRole("button", { name: "Periodic", exact: true }).click();
    await page.getByRole("button", { name: "List", exact: true }).click();
    await page.waitForTimeout(500);
    const worst = await slowest(page);
    test.info().annotations.push({ type: "menu-inp-ms", description: `${Math.round(worst.duration)} (${worst.name})` });
    expect(worst.duration).toBeLessThanOrEqual(INP_BUDGET_MS);
  });

  test("booking: picking an outlet, a day, a time and a party size responds within 200 ms", async ({ page }) => {
    test.slow();
    await slowPhone(page);
    await page.goto("/book", { waitUntil: "networkidle" });
    /* A settled page: the visitor reads the screen before the first tap (the mock backend loads at idle). */
    await page.waitForTimeout(2000);
    await page.getByRole("radio", { name: /C Scheme/ }).check();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByText("Tomorrow", { exact: true }).click();
    await page.getByText("4 PM", { exact: true }).click({ force: true });
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "One more" }).click();
    await page.getByRole("button", { name: "One more" }).click();
    await page.waitForTimeout(500);
    const worst = await slowest(page);
    test.info().annotations.push({ type: "book-inp-ms", description: `${Math.round(worst.duration)} (${worst.name})` });
    expect(worst.duration).toBeLessThanOrEqual(INP_BUDGET_MS);
  });

  test("home: opening the menu and the steep clock controls respond within 200 ms", async ({ page }) => {
    test.slow();
    await slowPhone(page);
    await page.goto("/", { waitUntil: "networkidle" });
    /* A settled page: the visitor reads the screen before the first tap (the mock backend loads at idle). */
    await page.waitForTimeout(2000);
    await page.getByRole("button", { name: "Open navigation" }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.type("96");
    await page.waitForTimeout(800);
    const worst = await slowest(page);
    test.info().annotations.push({ type: "home-inp-ms", description: `${Math.round(worst.duration)} (${worst.name})` });
    expect(worst.duration).toBeLessThanOrEqual(INP_BUDGET_MS);
  });
});
