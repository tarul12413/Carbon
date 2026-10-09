import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { shot } from "./shot";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];
const PAGES = [
  "/menu",
  "/cold-brew",
  "/outlets",
  "/outlets/c-scheme",
  "/outlets/raja-park",
  "/outlets/vaishali-nagar",
  "/story",
];

for (const path of PAGES) {
  test(`${path} is accessible and fits the screen`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(results.violations).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test.describe("menu", () => {
  test("search, filters and the paper theme", async ({ page }, info) => {
    await page.goto("/menu");
    await expect(page.locator("main")).toHaveAttribute("data-theme", "paper");
    await expect(page.getByText("166 items")).toBeVisible();
    await shot(page, "menu", info.project.name);

    await page.getByLabel("Search the menu").fill("matcha");
    await expect(page.getByText("6 items")).toBeVisible();
    await page.getByLabel("Search the menu").fill("");

    await page.getByRole("button", { name: "Cold brew", exact: true }).click();
    await expect(page.getByText("7 items")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cold brew", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.getByLabel("Search the menu").fill("zzz");
    await expect(page.getByText(/Nothing matches/)).toBeVisible();
    await page.getByRole("button", { name: "pizza" }).click();
    await expect(page.getByText("7 items")).toBeVisible();
  });

  test("periodic view shows signatures and opens a sheet", async ({ page }, info) => {
    await page.goto("/menu");
    await page.getByRole("button", { name: "Periodic" }).click();
    await expect(page.getByText("11 items")).toBeVisible();
    await page.getByRole("button", { name: /Pink Carbon/ }).click();
    const sheet = page.getByRole("dialog", { name: "Pink Carbon" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("₹250")).toBeVisible();
    await shot(page, "menu-sheet", info.project.name);
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("offers the PDF download", async ({ page, request }) => {
    await page.goto("/menu");
    const link = page.getByRole("link", { name: "Download the PDF menu" });
    const href = await link.getAttribute("href");
    expect(href).toMatch(/\.pdf$/);
    const response = await request.get(href!);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
  });

  test("table QR codes open the menu for that outlet", async ({ page }) => {
    await page.goto("/menu?src=qr&outlet=vaishali-nagar");
    await expect(page.getByRole("status")).toHaveText("Scanned at Vaishali Nagar. Here's the menu.");
  });

  test("home links land on the item", async ({ page }) => {
    await page.goto("/menu#whiskey-barrel");
    await expect(page.locator("#whiskey-barrel")).toBeInViewport();
  });
});

test.describe("cold brew", () => {
  test("the steep explorer shows what is ready", async ({ page }, info) => {
    await page.goto("/cold-brew");
    await expect(page.getByText(/Nothing's ready yet/)).toBeVisible();
    await page.getByRole("button", { name: "28h" }).click();
    await expect(page.getByText("4 brews ready")).toBeVisible();
    const slider = page.getByRole("slider", { name: "Steep time" });
    await slider.focus();
    await page.keyboard.press("End");
    await expect(page.getByText("7 brews ready")).toBeVisible();
    await shot(page, "cold-brew", info.project.name);
  });
});

test.describe("outlets", () => {
  test("confirmed address gets directions and structured data", async ({ page }) => {
    await page.goto("/outlets/c-scheme");
    await expect(page.getByRole("link", { name: "Open in Google Maps" })).toBeVisible();
    const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(data["@type"]).toBe("CafeOrCoffeeShop");
    expect(data.address.streetAddress).toContain("Amir Manzil");
  });

  test("unconfirmed address is marked and left out of structured data", async ({ page }, info) => {
    await page.goto("/outlets/vaishali-nagar");
    await expect(page.getByRole("link", { name: "Open in Google Maps" })).toHaveCount(0);
    await expect(page.getByText("Directions once the address is confirmed.")).toBeVisible();
    const data = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(data.address).toBeUndefined();
    await shot(page, "outlet", info.project.name);
  });

  test("unknown outlets are a 404", async ({ page }) => {
    const response = await page.goto("/outlets/mumbai");
    expect(response?.status()).toBe(404);
  });
});

test("story lists press by title only", async ({ page }, info) => {
  await page.goto("/story");
  await expect(page.getByText("Carbon Isn't a Coffee Shop. It's a Mood")).toBeVisible();
  await expect(page.getByText("Link to come")).toHaveCount(3);
  await shot(page, "story", info.project.name, true);
});
