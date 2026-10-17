import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { shot } from "./shot";

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"];

const axe = async (page: Page) => {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations).toEqual([]);
};

const fitsScreen = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
};

test.describe("book wall", () => {
  test("add a book: it waits for staff, then joins the shelf", async ({ page }, info) => {
    test.slow();
    await page.clock.install();
    await page.goto("/book-wall");
    await expect(page.getByRole("heading", { level: 1, name: "The book wall" })).toBeVisible();
    const malgudi = page.getByRole("button", { name: /^Malgudi Days by R\. K\. Narayan, 3 readers$/ });
    await expect(malgudi).toBeVisible();
    await expect(page.getByText("16 books, 22 readers")).toBeVisible();
    await page.clock.fastForward(2000);
    await axe(page);
    await fitsScreen(page);
    await shot(page, "book-wall", info.project.name, true);

    await malgudi.click();
    const detail = page.getByRole("dialog", { name: "Malgudi Days" });
    await expect(detail.getByText("Shelved by 3 readers")).toBeVisible();
    await expect(detail.getByText("Sample reader A")).toBeVisible();
    await axe(page);
    await shot(page, "book-wall-detail", info.project.name);
    await detail.getByRole("button", { name: "I read this too" }).click();
    await expect(detail.getByText("Shelved by 4 readers")).toBeVisible();
    await expect(detail.getByRole("button", { name: "Counted. Thanks." })).toBeDisabled();
    await detail.getByRole("button", { name: "Report" }).click();
    await expect(detail.getByRole("button", { name: "Thanks. Staff will take a look." })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(detail).toBeHidden();

    await page.getByRole("link", { name: "Add your book" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Add your book" })).toBeVisible();
    await page.getByLabel("Book title").fill("The Overstory");
    await page.getByLabel("Author").fill("Richard Powers");
    await page.getByLabel("One line: why?").fill("Trees, mostly.");
    await page.getByLabel("First name or handle").fill("Test reader");
    await page.getByLabel("Show my name on the wall").check();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "book-wall-add", info.project.name, true);
    await page.clock.fastForward(4000);
    await page.getByRole("button", { name: "Send to the wall" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "On its way to the shelf." })).toBeVisible();

    await page.getByRole("link", { name: "See the wall" }).click();
    await expect(page.getByText("1 waiting for staff")).toBeVisible();
    await expect(page.getByRole("button", { name: /^The Overstory/ })).toHaveCount(0);
    await page.goto("/admin/wall");
    await page.getByRole("button", { name: /^Marketing, All outlets/ }).click();
    await page.getByRole("button", { name: "Approve: The Overstory" }).click();
    await expect(page.getByRole("status")).toContainText("The Overstory is on the shelf.");
    await page.goto("/book-wall");
    await expect(page.getByRole("button", { name: /^The Overstory by Richard Powers, 1 reader$/ })).toBeVisible();
    await page.getByRole("button", { name: /^The Overstory/ }).click();
    await expect(page.getByRole("dialog").getByText("Test reader")).toBeVisible();
  });

  test("checks for bots, bad words and limits", async ({ page }) => {
    await page.clock.install();
    await page.goto("/book-wall/add");
    await page.getByLabel("Book title").fill("Something");
    await page.getByLabel("Author").fill("Someone");
    await page.getByLabel("One line: why?").fill("total sh1t");
    await page.getByRole("button", { name: "Send to the wall" }).click();
    await expect(page.getByText("Something looked automated. Clear the hidden field and try again.")).toBeVisible();
    await page.clock.fastForward(4000);
    await page.getByRole("button", { name: "Send to the wall" }).click();
    await expect(page.getByText("Keep it clean, please.")).toBeVisible();
    await page.getByLabel("Author").fill("");
    await page.getByRole("button", { name: "Send to the wall" }).click();
    await expect(page.getByText("Add the author.")).toBeVisible();
    await expect(page.getByLabel("One line: why?")).toHaveAttribute("maxlength", "80");
  });
});

test.describe("enquiries", () => {
  test("send an enquiry, with the type from the link", async ({ page }, info) => {
    await page.goto("/enquire?type=collab");
    await expect(page.getByRole("heading", { level: 1, name: "Enquire." })).toBeVisible();
    await expect(page.getByRole("radio", { name: /Collab or launch/ })).toBeChecked();
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText("Tell us your name.")).toBeVisible();
    await expect(page.getByText("Please accept the privacy notice to send this.")).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "enquire", info.project.name, true);

    await page.getByLabel("Name").fill("Test guest");
    await page.getByLabel("Phone").fill("90000 00096");
    await page.getByLabel("How many people").fill("60");
    await page.getByLabel("Tell us more").fill("A product launch for about sixty people, evening.");
    await page.getByLabel("I accept the privacy notice").check();
    await page.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Got it." })).toBeVisible();
    await expect(page.getByText(/^Reference ENQ-\d{4}\.$/)).toBeVisible();
    await axe(page);
    await shot(page, "enquire-done", info.project.name);
  });

  test("large groups from booking land on 'Something else'", async ({ page }) => {
    await page.goto("/enquire?type=other");
    await expect(page.getByRole("radio", { name: /Something else/ })).toBeChecked();
  });
});

test.describe("legal, 404 and offline", () => {
  for (const [path, title] of [
    ["/legal/privacy", "Privacy notice"],
    ["/legal/terms", "Terms of use"],
    ["/legal/refunds", "Cancellation and refunds"],
  ] as const) {
    test(`${path} is marked as a placeholder`, async ({ page }, info) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      await expect(page.getByRole("note")).toContainText("Placeholder text");
      await expect(page.getByText("TBC").first()).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Legal pages" }).locator('[aria-current="page"]')).toHaveCount(
        1,
      );
      await axe(page);
      await fitsScreen(page);
      if (path === "/legal/privacy") await shot(page, "legal-privacy", info.project.name, true);
    });
  }

  test("/legal goes to the privacy notice", async ({ page }) => {
    await page.goto("/legal");
    await expect(page).toHaveURL(/\/legal\/privacy$/);
  });

  test("404 is friendly and links back", async ({ page }, info) => {
    const response = await page.goto("/no-such-page");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1, name: "Nothing steeping here." })).toBeVisible();
    await expect(page.getByRole("link", { name: "See the menu" })).toBeVisible();
    await axe(page);
    await shot(page, "not-found", info.project.name);
  });

  test.describe("offline", () => {
    test.use({ serviceWorkers: "allow" });

    test("pages opened before still work; others show the offline page", async ({ page, context }, info) => {
      await page.goto("/book-wall");
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload();
      await expect(page.getByRole("button", { name: /^Malgudi Days/ })).toBeVisible();

      await context.setOffline(true);
      await page.reload();
      await expect(page.getByRole("heading", { level: 1, name: "The book wall" })).toBeVisible();
      await expect(page.getByRole("button", { name: /^Malgudi Days/ })).toBeVisible();

      await page.goto("/story");
      await expect(page.getByRole("heading", { level: 1, name: "No signal." })).toBeVisible();
      await axe(page);
      await shot(page, "offline", info.project.name);
      await context.setOffline(false);
    });
  });
});
