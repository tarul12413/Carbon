import { writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { shot } from "./shot";

/*
 * The brief's other test sizes (393x852, 1366x768, 1920x1080) and foldables (Blueprint section 6).
 * The three main projects cover 360, 744 and 1440; this file runs once, in the laptop project.
 */

const PAGES = [
  "/",
  "/menu",
  "/cold-brew",
  "/outlets",
  "/outlets/c-scheme",
  "/story",
  "/book",
  "/events",
  "/events/coffee-rave",
  "/book-wall",
  "/book-wall/add",
  "/enquire",
  "/legal/privacy",
  "/staff",
  "/admin",
];

const SIZES = [
  { name: "phone-393", width: 393, height: 852 },
  { name: "laptop-1366", width: 1366, height: 768 },
  { name: "wide-1920", width: 1920, height: 1080 },
] as const;

const INTERACTIVE = "a[href], button, input, select, textarea, [role=radio], [role=checkbox]";

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** Interactive elements that overlap the band [from, to] (CSS px): inside two-column layouts, or anywhere. */
const inBand = (page: Page, from: number, to: number, scope = ".fold-grid") =>
  page.evaluate(
    ({ from, to, selector, scope }) =>
      [...document.querySelectorAll(scope)]
        .flatMap((grid) => [...grid.querySelectorAll(selector)])
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          const shown = r.width > 0 && r.height > 0 && style.visibility !== "hidden";
          return shown && r.left < to && r.right > from;
        })
        .map((el) => el.outerHTML.slice(0, 90)),
    { from, to, selector: INTERACTIVE, scope },
  );

test.describe("responsive pass", () => {
  /* Runs once: the phone and tablet projects are the mobile ones. */
  test.skip(({ isMobile }) => isMobile, "Runs once, in the laptop project");

  for (const size of SIZES) {
    test(`every page fits at ${size.width}x${size.height}`, async ({ page }) => {
      test.slow();
      await page.setViewportSize({ width: size.width, height: size.height });
      for (const path of PAGES) {
        await page.goto(path);
        await expect(page.locator("h1").first()).toBeVisible();
        expect(await overflow(page), `${path} scrolls sideways`).toBeLessThanOrEqual(0);
        if (size.width >= 1920) {
          /* Content is capped near 1440 and centred (brief, responsive). */
          const widest = await page.evaluate(() =>
            Math.max(...[...document.querySelectorAll(".content-cap")].map((el) => el.getBoundingClientRect().width)),
          );
          expect(widest, `${path} content cap`).toBeLessThanOrEqual(1440);
        }
      }
      for (const path of ["/", "/menu", "/book"]) {
        await page.goto(path);
        await expect(page.locator("h1").first()).toBeVisible();
        await shot(page, `responsive${path === "/" ? "-home" : path.replace("/", "-")}`, size.name);
      }
    });
  }

  test("open foldables: two-column layouts keep controls out of the middle 40px", async ({ page }) => {
    test.slow();
    for (const width of [600, 673, 744, 884]) {
      await page.setViewportSize({ width, height: 900 });
      const middle = width / 2;
      for (const path of ["/", "/book", "/enquire", "/events", "/outlets", "/cold-brew", "/menu"]) {
        await page.goto(path);
        await expect(page.locator("h1").first()).toBeVisible();
        expect(await inBand(page, middle - 20, middle + 20), `${path} at ${width}px`).toEqual([]);
      }
    }
  });

  test("dual screens: with two segments reported, two-column layouts follow the screens", async ({ page }, info) => {
    test.slow();
    /* A spanned dual-screen device: two 540px screens and a 34px seam (Surface Duo-like). */
    await page.setViewportSize({ width: 1114, height: 720 });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1114,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false,
      displayFeature: { orientation: "vertical", offset: 540, maskLength: 34 },
    });
    for (const path of [...PAGES, "/outlets/raja-park", "/my-carbon"]) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      expect(await page.evaluate(() => matchMedia("(horizontal-viewport-segments: 2)").matches)).toBe(true);
      expect(await inBand(page, 540, 574, "body"), path).toEqual([]);
    }
    /* Through the protocol: Playwright's own screenshot resets the screen emulation. */
    for (const path of ["/", "/book"]) {
      await page.goto(path);
      await expect(page.locator("h1").first()).toBeVisible();
      const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
      const name = path === "/" ? "home" : "book";
      writeFileSync(
        `tests/screenshots/latest/dual-screen-${name}-${info.project.name}.png`,
        Buffer.from(data, "base64"),
      );
    }
  });
});
