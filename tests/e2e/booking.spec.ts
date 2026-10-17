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

/** Clicks the visible label; the radio itself is visually hidden. */
async function pickTime(page: Page, time: string) {
  await page.getByText(time, { exact: true }).click();
  await expect(page.getByRole("radio", { name: time, exact: true })).toBeChecked();
}

/** Steps one to three: outlet, tomorrow at a time, party size. */
async function pickSlot(page: Page, { outlet = "C Scheme", time = "4 PM", party = 2 } = {}) {
  await page.goto("/book");
  await expect(page.getByRole("heading", { level: 1, name: "Book a table" })).toBeVisible();
  await page.getByRole("radio", { name: new RegExp(outlet) }).check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "When are you coming?" })).toBeFocused();
  await page.getByText("Tomorrow", { exact: true }).click();
  await pickTime(page, time);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "How many of you?" })).toBeVisible();
  for (let n = 2; n < party; n += 1) await page.getByRole("button", { name: "One more" }).click();
  for (let n = 2; n > party; n -= 1) await page.getByRole("button", { name: "One fewer" }).click();
  await expect(page.locator("output")).toHaveText(String(party));
  await page.getByRole("button", { name: "Continue" }).click();
}

async function fillDetails(page: Page) {
  await expect(page.getByRole("heading", { level: 1, name: "Your details" })).toBeVisible();
  await page.getByLabel("Name").fill("Test guest");
  await page.getByLabel("Phone").fill("90000 00042");
  await page.getByLabel("Anything we should know?").fill("Window seat if you have one");
  await page.getByLabel("I accept the privacy notice").check();
}

const storedWebBookings = (page: Page) =>
  page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem("carbon-demo:db:v2") ?? "{}") as {
      bookings?: { source: string; status: string }[];
    };
    return (db.bookings ?? []).filter((b) => b.source === "web");
  });

test.describe("book a small table", () => {
  test("instant confirmation, then change and cancel", async ({ page }, info) => {
    test.slow();
    await pickSlot(page, { party: 4 });
    await fillDetails(page);
    await axe(page);
    await shot(page, "book-details", info.project.name, true);
    await page.getByRole("button", { name: "Review" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Review and pay" })).toBeVisible();
    await expect(page.getByRole("timer")).toHaveText(/^(10:00|09:\d\d)$/);
    await expect(page.getByRole("radio", { name: /Pay at the cafe/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /Pay online/ })).not.toBeChecked();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "book-review", info.project.name, true);
    await page.getByRole("button", { name: "Confirm booking" }).click();

    await expect(page).toHaveURL(/\/book\/CRB-\d{4}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Table's yours." })).toBeVisible();
    await expect(page.getByText(/party of 4/)).toBeVisible();
    await expect(page.getByText("+91 ••••• •0042")).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "book-confirmed", info.project.name, true);

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Add to calendar" }).click();
    expect((await download).suggestedFilename()).toMatch(/^carbon-CRB-\d{4}\.ics$/);

    await page.getByRole("button", { name: "WhatsApp me the details" }).click();
    await expect(page.getByText(/Sample only/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Directions" })).toHaveAttribute("href", /google\.com\/maps/);

    await page.getByRole("button", { name: "Move to another time" }).click();
    await pickTime(page, "5 PM");
    await page.getByRole("button", { name: "Move my booking" }).click();
    await expect(page.getByRole("status")).toHaveText(/^Moved to .*5 PM\.$/);

    await page.getByRole("button", { name: "Cancel booking" }).click();
    await page.getByRole("button", { name: "Yes, cancel it" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cancelled." })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { level: 1, name: "Cancelled." })).toBeVisible();
  });

  test("full slots are struck through and cannot be picked", async ({ page }, info) => {
    await page.goto("/book?outlet=c-scheme");
    await expect(page.getByRole("heading", { level: 1, name: "When are you coming?" })).toBeVisible();
    await page.getByText("Tomorrow", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "7 PM, full" })).toBeDisabled();
    await expect(page.getByRole("radio", { name: "6:30 PM, filling up" })).toBeEnabled();
    await expect(page.getByText("7 PM, 7:30 PM, 8 PM is full.")).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "book-time", info.project.name, true);
  });

  test("checks the details before holding a table", async ({ page }) => {
    await pickSlot(page);
    await page.getByRole("button", { name: "Review" }).click();
    const summary = page.getByRole("alert").filter({ hasText: "A few things to fix" });
    await expect(summary).toContainText("Tell us a name for the booking.");
    await expect(summary).toContainText("Enter a 10-digit Indian mobile number");
    await expect(summary).toContainText("Please accept the privacy notice to book.");
    await expect(page.getByLabel("Phone")).toHaveAttribute("aria-invalid", "true");
    expect(await storedWebBookings(page)).toHaveLength(0);
  });

  test("a double tap holds one table", async ({ page }) => {
    await pickSlot(page);
    await fillDetails(page);
    await page.getByRole("button", { name: "Review" }).dblclick();
    await expect(page.getByRole("heading", { level: 1, name: "Review and pay" })).toBeVisible();
    /* The second tap landed on the new screen and was ignored: still the default choice, not confirmed. */
    await expect(page.getByRole("radio", { name: /^Pay at the cafe/ })).toBeChecked();
    await page.waitForTimeout(450);
    await page.getByText("Pay at the cafe", { exact: true }).click();
    await page.getByRole("button", { name: "Confirm booking" }).dblclick();
    await expect(page.getByRole("heading", { level: 1, name: "Table's yours." })).toBeVisible();
    expect(await storedWebBookings(page)).toEqual([expect.objectContaining({ status: "confirmed" })]);
  });

  test("going back and changing the time releases the first hold", async ({ page }) => {
    await pickSlot(page);
    await fillDetails(page);
    await page.getByRole("button", { name: "Review" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.goBack();
    await page.goBack();
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "When are you coming?" })).toBeVisible();
    await pickTime(page, "4:30 PM");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByLabel("Name")).toHaveValue("Test guest");
    await page.getByRole("button", { name: "Review" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    const statuses = (await storedWebBookings(page)).map((b) => b.status);
    expect(statuses).toEqual(["expired", "held"]);
  });
});

test.describe("hold expiry", () => {
  test("says so kindly and offers to check the time again", async ({ page }, info) => {
    await page.clock.install();
    await pickSlot(page);
    await fillDetails(page);
    await page.getByRole("button", { name: "Review" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.clock.fastForward("10:01");
    await expect(page.getByText("The hold ran out.")).toBeVisible();
    await shot(page, "book-hold-expired", info.project.name);
    await page.getByRole("button", { name: "Check the time again" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "When are you coming?" })).toBeVisible();
    expect((await storedWebBookings(page)).map((b) => b.status)).toEqual(["expired"]);
  });
});

test.describe("request a large group", () => {
  test("sends a request with status Requested", async ({ page }, info) => {
    await pickSlot(page, { outlet: "Raja Park", time: "1 PM", party: 12 });
    await fillDetails(page);
    await page.getByRole("button", { name: "Review" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Group of 12?" })).toBeVisible();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Tell us the occasion.")).toBeVisible();
    await page.getByLabel("Occasion").fill("Team dinner");
    await page.getByLabel("Budget per head (optional)").fill("Flexible");
    await axe(page);
    await shot(page, "book-request", info.project.name, true);
    await page.getByRole("button", { name: "Send request" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Request sent." })).toBeVisible();
    await expect(page.getByText(/Staff reply on WhatsApp within/)).toBeVisible();
    await axe(page);
    await shot(page, "book-requested", info.project.name, true);
  });

  test("the party step explains instant versus request", async ({ page }, info) => {
    await page.goto("/book?outlet=vaishali-nagar");
    await page.getByText("Tomorrow", { exact: true }).click();
    await pickTime(page, "2 PM");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("Up to 6: confirmed instantly.")).toBeVisible();
    for (let n = 2; n < 7; n += 1) await page.getByRole("button", { name: "One more" }).click();
    await expect(page.getByText("7 or more?")).toBeVisible();
    await axe(page);
    await shot(page, "book-party", info.project.name);
  });
});

test.describe("booking page", () => {
  test("an unknown code explains where bookings live", async ({ page }) => {
    await page.goto("/book/CRB-0000");
    await expect(page.getByRole("heading", { level: 1, name: "We can't find that booking." })).toBeVisible();
    await axe(page);
  });

  test("the phone bar links to booking and hides in the flow", async ({ page }, info) => {
    test.skip(info.project.name !== "phone-360", "Phones only");
    await page.goto("/menu");
    const bar = page.getByRole("link", { name: "Book a table" }).last();
    await expect(bar).toBeInViewport();
    await bar.click();
    await expect(page).toHaveURL(/\/book$/);
    await expect(page.locator(".fixed.bottom-0")).toHaveCount(0);
  });
});

test("the availability endpoint answers in the planned shape", async ({ request }) => {
  const response = await request.get("/api/availability?outlet=c-scheme&date=2099-01-01&partySize=2");
  expect(response.status()).toBe(422);
  expect(await response.json()).toEqual({ ok: false, error: { code: "outside_window" } });
});
