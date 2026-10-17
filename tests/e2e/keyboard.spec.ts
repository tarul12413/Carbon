import { expect, test, type Page } from "@playwright/test";

/*
 * Keyboard-only use (brief: full keyboard use, visible amber focus rings). Runs in the laptop
 * project, where people use a keyboard.
 */

const focused = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const style = getComputedStyle(el);
    return {
      tag: el.tagName,
      text: (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40),
      outline: style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2,
      outlineColor: style.outlineColor,
    };
  });

test.describe("keyboard", () => {
  test.skip(({ isMobile }) => isMobile, "keyboard flows run in the laptop project");

  test("the skip link comes first and jumps to the content", async ({ page }) => {
    await page.goto("/story");
    await page.keyboard.press("Tab");
    expect(await focused(page)).toMatchObject({ tag: "A", text: "Skip to content", outline: true });
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#content$/);
  });

  test("every focus stop on the home page shows the amber ring", async ({ page }) => {
    await page.goto("/");
    const ring = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--focus-ring").trim(),
    );
    expect(ring).not.toBe("");
    const seen: string[] = [];
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Tab");
      const f = await focused(page);
      if (!f || f.tag === "BODY") break;
      expect(f.outline, `${f.tag} "${f.text}" has no visible focus ring`).toBe(true);
      seen.push(f.text);
    }
    expect(seen.length).toBeGreaterThan(10);
  });

  test("a table can be booked to the details step without a mouse", async ({ page }) => {
    await page.goto("/book");
    await page.getByRole("radio", { name: /C Scheme/ }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: /C Scheme/ })).toBeChecked();
    await page.getByRole("button", { name: "Continue" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "When are you coming?" })).toBeFocused();

    await page.getByRole("radio", { name: "Tomorrow" }).focus();
    await page.keyboard.press("Space");
    await page.getByRole("radio", { name: "4 PM", exact: true }).focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("radio", { name: "4 PM", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Continue" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "How many of you?" })).toBeFocused();
    await page.getByRole("button", { name: "One more" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("output")).toHaveText("3");
    await page.getByRole("button", { name: "Continue" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeFocused();
  });

  test("a book wall spine opens with Enter, closes with Escape and gets focus back", async ({ page }) => {
    await page.goto("/book-wall");
    const spine = page.getByRole("button", { name: /^Malgudi Days/ });
    await spine.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Malgudi Days" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(spine).toBeFocused();
  });

  test("with reduced motion, the steep clock is stacked cards and nothing animates", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("#steep-clock")).not.toHaveAttribute("data-mode", "pinned");
    const longest = await page.evaluate(() =>
      Math.max(0, ...document.getAnimations().map((a) => Number(a.effect?.getComputedTiming().duration ?? 0))),
    );
    expect(longest).toBeLessThanOrEqual(1);
  });
});
