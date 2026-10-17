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

const signIn = async (page: Page, account: RegExp, path = "/admin") => {
  await page.goto(path);
  await page.getByRole("button", { name: account }).click();
};

const openSection = async (page: Page, name: string) => {
  await page.getByRole("navigation", { name: "Admin sections" }).getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name, exact: true })).toBeVisible();
  await expect(page).toHaveTitle(new RegExp(`^${name}`));
};

/** A group request for 12 at Raja Park tomorrow, made through the public booking flow. */
async function requestGroup(page: Page) {
  await page.goto("/book?outlet=raja-park");
  await page.getByText("Tomorrow", { exact: true }).click();
  await page.getByText("1 PM", { exact: true }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  for (let n = 2; n < 12; n += 1) await page.getByRole("button", { name: "One more" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Name").fill("Test guest");
  await page.getByLabel("Phone").fill("90000 00042");
  await page.getByLabel("I accept the privacy notice").check();
  await page.getByRole("button", { name: "Review" }).click();
  await page.getByLabel("Occasion").fill("Team lunch");
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Request sent." })).toBeVisible();
  return /\/book\/(CRB-\d{4})/.exec(page.url())?.[1] ?? "";
}

test.describe("admin", () => {
  test("a manager approves a group request, and the guest sees it confirmed", async ({ page }, info) => {
    test.slow();
    const code = await requestGroup(page);
    expect(code).toMatch(/^CRB-\d{4}$/);

    await page.goto("/admin");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in to the back office" })).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "admin-sign-in", info.project.name, true);

    await page.getByRole("button", { name: /^Manager, Raja Park/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Today" })).toBeVisible();
    await expect(page.getByLabel("Outlet", { exact: true })).toBeDisabled();
    await expect(page.getByRole("link", { name: /Requests to review\s*2/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Seats by slot" })).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "admin-dashboard", info.project.name, true);

    await openSection(page, "Bookings");
    const card = page.getByRole("listitem").filter({ hasText: code });
    await expect(card.getByText("Test guest · 12 guests")).toBeVisible();
    await expect(card.getByText("Team lunch")).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "admin-requests", info.project.name, true);
    await card.getByRole("button", { name: "Approve" }).click();
    await expect(page.getByRole("status")).toContainText(`${code} approved.`);
    await expect(page.getByRole("listitem").filter({ hasText: code })).toHaveCount(0);

    await openSection(page, "Audit log");
    await expect(page.getByText("Approved a request").first()).toBeVisible();
    await expect(page.getByText(code).first()).toBeVisible();
    await axe(page);
    await shot(page, "admin-audit", info.project.name, true);

    await page.goto(`/book/${code}`);
    await expect(page.getByText("Confirmed").first()).toBeVisible();
  });

  test("each role sees only its sections and outlets", async ({ page }) => {
    await signIn(page, /^Barista, C Scheme/);
    const nav = page.getByRole("navigation", { name: "Admin sections" });
    await expect(nav.getByRole("link")).toHaveText(["Today", "Bookings", "Events"]);
    await expect(page.getByText("Requests to review")).toHaveCount(0);
    await page.goto("/admin/capacity");
    await expect(page.getByText("This account can't open this section.")).toBeVisible();

    await page.getByLabel("Signed in as").selectOption({ label: "Marketing, All outlets" });
    await expect(nav.getByRole("link")).toHaveText(["Today", "Events", "Book wall", "Enquiries"]);
    await page.goto("/admin/bookings");
    await expect(page.getByText("This account can't open this section.")).toBeVisible();

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Sign in to the back office" })).toBeVisible();
  });

  test("closing a date in admin closes it for bookings", async ({ page }, info) => {
    await signIn(page, /^Manager, C Scheme/, "/admin/capacity");
    await expect(page.getByRole("heading", { level: 1, name: "Capacity and hours" })).toBeVisible();
    const tomorrow = await page.evaluate(() => {
      const d = new Date(Date.now() + 24 * 60 * 60_000);
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(d);
    });
    await page.getByLabel("Date", { exact: true }).fill(tomorrow);
    await page.getByLabel("Reason (staff only)").fill("Festival");
    await page.getByRole("button", { name: "Add date" }).click();
    await page.getByLabel("Seats bookable per slot").fill("30");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status")).toContainText("Saved.");
    await expect(page.getByRole("status")).toContainText("upcoming bookings now fall outside");
    await axe(page);
    await fitsScreen(page);
    await shot(page, "admin-capacity", info.project.name, true);

    await page.goto("/book?outlet=c-scheme");
    await page.getByText("Tomorrow", { exact: true }).click();
    await expect(page.getByText("Closed for bookings on Tomorrow.")).toBeVisible();
  });

  test("menu: a price waits as a draft, publishes, and warns about the PDF; sold out shows at once", async ({
    page,
  }, info) => {
    test.slow();
    await signIn(page, /^Owner, All outlets/, "/admin/menu");
    await expect(page.getByText("The PDF matches the published menu.")).toBeVisible();
    await page.getByLabel("Search the menu").fill("Mint Lime");
    await page.getByRole("button", { name: "Edit Mint Lime" }).click();
    await page.getByLabel("Price (Rs)").fill("310");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("1 change in draft")).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "admin-menu-draft", info.project.name, true);

    await page.goto("/menu");
    await expect(page.locator("#mint-lime")).toContainText("Rs 300");

    await page.goto("/admin/menu");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("status")).toContainText("Published 1 change.");
    await expect(page.getByText(/^1 item changed after this PDF was uploaded/)).toBeVisible();

    await page.getByLabel("Search the menu").fill("Mint Lime");
    const available = page.getByRole("checkbox", { name: "Available: Mint Lime" });
    await available.click();
    await expect(available).not.toBeChecked();
    await expect(page.getByRole("status")).toContainText("Mint Lime is sold out at C Scheme.");
    await shot(page, "admin-menu", info.project.name, true);

    await page.goto("/menu?src=qr&outlet=c-scheme");
    await expect(page.locator("#mint-lime")).toContainText("Rs 310");
    await expect(page.locator("#mint-lime")).toContainText("Not today");
    await page.goto("/menu");
    await expect(page.locator("#mint-lime")).not.toContainText("Not today");

    await page.goto("/admin/menu");
    await page.getByLabel("Upload a new PDF").setInputFiles({
      name: "not-a-menu.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("hello"),
    });
    await expect(page.getByText("That isn't a PDF.")).toBeVisible();
    await page.getByLabel("Upload a new PDF").setInputFiles({
      name: "menu-october.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.7\n%sample\n"),
    });
    await expect(page.getByText("The PDF matches the published menu.")).toBeVisible();
    await expect(page.getByText(/^menu-october\.pdf, uploaded/)).toBeVisible();
  });

  test("a manager can only switch availability, at their outlet", async ({ page }) => {
    await signIn(page, /^Manager, C Scheme/, "/admin/menu");
    await expect(page.getByText("Only the owner edits names and prices.")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Edit / })).toHaveCount(0);
    await expect(page.getByLabel("Availability at")).toBeDisabled();
  });

  test("marketing moves an enquiry along and sees events", async ({ page }, info) => {
    await page.goto("/enquire?type=catering");
    await page.getByLabel("Name").fill("Test guest");
    await page.getByLabel("Phone").fill("90000 00097");
    await page.getByLabel("Tell us more").fill("Cold brew bar for an office party, about forty people.");
    await page.getByLabel("I accept the privacy notice").check();
    await page.getByRole("button", { name: "Send enquiry" }).click();
    const ref = (await page.getByText(/^Reference ENQ-\d{4}\.$/).textContent())?.match(/ENQ-\d{4}/)?.[0] ?? "";

    await signIn(page, /^Marketing, All outlets/, "/admin/enquiries");
    const card = page.getByRole("listitem").filter({ hasText: ref });
    await expect(card.getByText("Catering", { exact: true })).toBeVisible();
    await card.getByLabel("Status").selectOption("replied");
    await card.getByLabel("Staff note").fill("Sent options on WhatsApp");
    await card.getByRole("button", { name: `Save: ${ref}` }).click();
    await expect(page.getByRole("status")).toContainText(`${ref} updated.`);
    await page.getByRole("button", { name: "New", exact: true }).click();
    await expect(page.getByText("None with that status.")).toBeVisible();
    await page.getByRole("button", { name: "Replied", exact: true }).click();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "admin-enquiries", info.project.name, true);

    await openSection(page, "Events");
    await page.getByRole("link", { name: "Attendees" }).first().click();
    await expect(page.getByText(/seats were sold in the sample data/)).toBeVisible();
    await expect(page).toHaveTitle(/^Attendees/);
    await axe(page);
    await fitsScreen(page);
    await shot(page, "admin-attendees", info.project.name, true);
  });
});
