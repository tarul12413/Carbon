import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { shot } from "./shot";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

async function scrollClockTo(page: Page, hour: number) {
  await page.evaluate((h) => {
    const track = document.querySelector<HTMLElement>("#steep-clock > div")!;
    const top = window.scrollY + track.getBoundingClientRect().top;
    window.scrollTo(0, Math.round(top + (h / 96) * (track.offsetHeight - window.innerHeight)));
  }, hour);
}

const clockFace = (page: Page) => page.locator("#steep-clock").getByText(/^\d+ hours steeped$/);

test.describe("home", () => {
  test("never shows a price", async ({ page }) => {
    await page.goto("/");
    const text = await page.locator("main").innerText();
    expect(text).not.toMatch(/₹|\bRs\.?\s?\d|\b\d{2,4}\.00\b/);
  });

  test("steep clock scrubs with native scroll and names brews at their steep time", async ({ page }, info) => {
    await page.goto("/");
    await expect(page.locator("#steep-clock")).toHaveAttribute("data-mode", "pinned");
    await expect(clockFace(page)).toHaveText("0 hours steeped");

    await scrollClockTo(page, 28);
    await expect(clockFace(page)).toHaveText("28 hours steeped");
    await expect(page.locator("#steep-28")).not.toHaveAttribute("inert");
    await expect(page.locator("#steep-18")).toHaveAttribute("inert", "");
    await expect(page.locator("#steep-clock [aria-live]")).toHaveText("28h. The Original and Tropical Monk.");
    await page.waitForTimeout(1500);
    await shot(page, "clock-28h", info.project.name);

    const results = await new AxeBuilder({ page }).include("#steep-clock").withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);

    await scrollClockTo(page, 96);
    await expect(clockFace(page)).toHaveText("96 hours steeped");
    await expect(page.locator("#steep-clock [aria-live]")).toHaveText("96h. Vanilla Orange and Berry Bold.");
  });

  test("next and previous buttons step between checkpoints", async ({ page }) => {
    await page.goto("/");
    await scrollClockTo(page, 0);
    await expect(clockFace(page)).toHaveText("0 hours steeped");
    const next = page.getByRole("button", { name: "Next brew" });
    const prev = page.getByRole("button", { name: "Previous brew" });

    await next.click();
    await expect(clockFace(page)).toHaveText("18 hours steeped");
    await next.click();
    await expect(clockFace(page)).toHaveText("24 hours steeped");
    await prev.click();
    await expect(clockFace(page)).toHaveText("18 hours steeped");
  });

  test('typing "96" runs the clock to the end', async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#steep-clock")).toHaveAttribute("data-mode", "pinned");
    await page.mouse.wheel(0, 200);
    await page.keyboard.type("96");
    await expect(clockFace(page)).toHaveText("96 hours steeped", { timeout: 10_000 });
  });

  test("reduced motion gets stacked cards, no pin", async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const clock = page.locator("#steep-clock");
    await expect(clock).toHaveAttribute("data-mode", "stacked");
    await expect(clock.getByRole("article")).toHaveCount(7);
    await expect(clock.locator("[inert]")).toHaveCount(0);
    await clock.scrollIntoViewIfNeeded();
    await shot(page, "clock-stacked", info.project.name);

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
  });

  test("hero, then the outlets", async ({ page }, info) => {
    await page.goto("/");
    await page.waitForTimeout(1600);
    await shot(page, "hero", info.project.name);
    await page.getByRole("heading", { name: /Come have one/ }).scrollIntoViewIfNeeded();
    await shot(page, "today", info.project.name);
  });
});

test.describe("home on a landscape phone", () => {
  test.use({ viewport: { width: 800, height: 360 }, isMobile: true, hasTouch: true });

  test("skips the pin", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#steep-clock")).toHaveAttribute("data-mode", "stacked");
  });
});
