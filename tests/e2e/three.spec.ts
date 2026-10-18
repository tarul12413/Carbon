import { expect, test, type Page } from "@playwright/test";

/*
 * The 3D layer (D-067, D-068). It loads after the page, layers over the SVG version and never
 * replaces it. Laptop project only: phones in the compact band never get 3D, by design.
 */

const glass = (page: Page) => page.locator('[data-three="glass"]');

async function scrollClockTo(page: Page, hour: number) {
  await page.evaluate((h) => {
    const track = document.querySelector<HTMLElement>("#steep-clock > div")!;
    const top = window.scrollY + track.getBoundingClientRect().top;
    window.scrollTo(0, Math.round(top + (h / 96) * (track.offsetHeight - window.innerHeight)));
  }, hour);
}

test.describe("3D", () => {
  test.skip(({ isMobile }) => isMobile, "3D runs on the laptop project");

  test("the steep glass waits for the visitor, then turns 3D over the SVG", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(1000);
    await expect(page.locator("canvas")).toHaveCount(0);

    await scrollClockTo(page, 40);
    await expect(glass(page)).toHaveAttribute("data-3d", "ready");
    await expect(glass(page).locator("canvas")).toHaveAttribute("aria-hidden", "true");
    /* The SVG stays in place underneath, so the layout cannot move. */
    await expect(glass(page).locator("svg")).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test("dragging the glass does not scroll or move the page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#steep-clock")).toHaveAttribute("data-mode", "pinned");
    await scrollClockTo(page, 60);
    await expect(glass(page)).toHaveAttribute("data-3d", "ready");
    const face = page.locator("#steep-clock").getByText(/^\d+ hours steeped$/);
    await expect(face).toHaveText("60 hours steeped");
    const box = (await glass(page).boundingBox())!;
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(face).toHaveText("60 hours steeped");
  });

  test("the cold-brew explorer's glass follows the slider in 3D", async ({ page }) => {
    await page.goto("/cold-brew");
    await page.mouse.wheel(0, 200);
    await expect(glass(page)).toHaveAttribute("data-3d", "ready");
    await page.getByRole("slider").fill("96");
    await expect(glass(page)).toHaveAttribute("data-3d", "ready");
  });

  test("reduced motion keeps the SVG glass and loads no 3D", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/cold-brew");
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(1500);
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(glass(page).locator("svg")).toBeVisible();
  });
});
