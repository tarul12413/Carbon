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

/** Event page → two tickets → checkout with details filled in. */
async function toCheckout(page: Page, slug = "coffee-rave") {
  await page.goto(`/events/${slug}`);
  await expect(page.getByText(/\d+ left/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/checkout\/ord_/);
  await expect(page.getByRole("heading", { level: 1, name: "Checkout" })).toBeVisible();
  await page.getByLabel("Name").fill("Test guest");
  await page.getByLabel("Phone").fill("90000 00055");
  await page.getByLabel("I accept the privacy notice").check();
}

/** Opens the sample sheet, picks the demo outcome and pays. */
async function payWith(page: Page, outcome: "Success" | "Failed" | "Pending") {
  const sheet = page.getByRole("dialog", { name: "Sample payment sheet" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("Not a real gateway. No money moves.")).toBeVisible();
  await sheet.getByText(outcome, { exact: true }).click();
  await sheet.getByRole("button", { name: /^Pay / }).click();
}

test.describe("events list", () => {
  test("shows the samples with stock badges and filters", async ({ page }, info) => {
    await page.goto("/events");
    await expect(page.getByRole("heading", { level: 1, name: "Events." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Coffee Rave" })).toBeVisible();
    await expect(page.getByText("Few left")).toBeVisible();
    await expect(page.getByText("Sold out")).toBeVisible();
    await expect(page.getByText("BMW Motorrad launch")).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "events", info.project.name, true);

    await page.getByRole("link", { name: "Collabs" }).click();
    await expect(page.getByText("Nothing on the calendar here yet.")).toBeVisible();
    await page.getByRole("link", { name: "Workshops" }).click();
    await expect(page.getByRole("link", { name: "Drip It Up" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Coffee Rave" })).toHaveCount(0);
  });

  test("unknown events are a 404", async ({ page }) => {
    const response = await page.goto("/events/not-an-event");
    expect(response?.status()).toBe(404);
  });
});

test.describe("buy an event ticket", () => {
  test("success: ticket with a signed QR, then cancel and refund", async ({ page }, info) => {
    test.slow();
    await page.goto("/events/coffee-rave");
    await axe(page);
    await shot(page, "event", info.project.name, true);
    await toCheckout(page);
    await expect(page.getByRole("timer")).toHaveText(/^(10:00|09:\d\d)$/);
    await axe(page);
    await shot(page, "checkout", info.project.name, true);
    await page.getByRole("button", { name: "Pay Rs ---" }).click();
    await axe(page);
    await shot(page, "payment-sheet", info.project.name);
    await payWith(page, "Success");

    await expect(page).toHaveURL(/\/tickets\/CRB-E-\d{4}$/);
    await expect(page.getByRole("heading", { level: 1, name: "You're in." })).toBeVisible();
    await expect(page.getByRole("img", { name: /Ticket QR code for CRB-E-\d{4}, admits 2/ })).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "ticket", info.project.name, true);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Add to calendar" }).click();
    expect((await download).suggestedFilename()).toMatch(/^carbon-CRB-E-\d{4}\.ics$/);

    await page.getByRole("link", { name: "Cancel this ticket" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cancel booking" })).toBeVisible();
    await expect(page.getByText("to the original method")).toBeVisible();
    await axe(page);
    await shot(page, "cancel-refund", info.project.name, true);
    await page.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cancelled and refunded." })).toBeVisible();
  });

  test("failed: seats stay held, then another try succeeds", async ({ page }, info) => {
    await toCheckout(page);
    await page.getByRole("button", { name: "Pay Rs ---" }).click();
    await payWith(page, "Failed");
    await expect(page.getByRole("heading", { level: 1, name: "Payment didn't go through" })).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();
    await axe(page);
    await shot(page, "payment-failed", info.project.name, true);
    await page.getByRole("button", { name: "Try again" }).click();
    await payWith(page, "Success");
    await expect(page.getByRole("heading", { level: 1, name: "You're in." })).toBeVisible();
  });

  test("pending: waits for the bank; a repeated webhook issues one ticket", async ({ page }, info) => {
    await toCheckout(page);
    await page.getByRole("button", { name: "Pay Rs ---" }).click();
    await payWith(page, "Pending");
    await expect(page.getByRole("heading", { level: 1, name: "Waiting for your bank" })).toBeVisible();
    await axe(page);
    await shot(page, "payment-pending", info.project.name, true);
    await page.getByText("Demo controls").click();
    await page.getByRole("button", { name: "Bank approves (webhook sent twice)" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "You're in." })).toBeVisible();
    const tickets = await page.evaluate(
      () => (JSON.parse(localStorage.getItem("carbon-demo:db:v2") ?? "{}") as { tickets: unknown[] }).tickets.length,
    );
    expect(tickets).toBe(1);
  });

  test("pay at the cafe reserves seats with an unpaid ticket", async ({ page }) => {
    await toCheckout(page, "kitchen-rave");
    await page.getByText("Pay at the cafe", { exact: true }).click();
    await page.getByRole("button", { name: "Reserve, pay at the cafe" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Seats reserved." })).toBeVisible();
    await expect(page.getByText("Pay at the cafe:")).toBeVisible();
  });

  test("checks details before taking payment", async ({ page }) => {
    await page.goto("/events/coffee-rave");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Pay Rs ---" }).click();
    await expect(page.getByText("Tell us a name for the booking.")).toBeVisible();
    await expect(page.getByText("Please accept the privacy notice to book.")).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Sample payment sheet" })).toBeHidden();
  });

  test("the seat hold runs out kindly", async ({ page }) => {
    await page.clock.install();
    await page.goto("/events/coffee-rave");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("timer")).toBeVisible();
    await page.clock.fastForward("10:01");
    await expect(page.getByRole("heading", { level: 1, name: "The hold ran out." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the event" })).toBeVisible();
  });
});

test.describe("waitlist", () => {
  test("join when sold out, then claim when a seat opens", async ({ page }, info) => {
    test.slow();
    await page.clock.install();
    await page.goto("/events/drip-it-up");
    await expect(page.getByText("Sold out", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "One fewer" }).click();
    await page.getByLabel("Phone").fill("90000 00056");
    await page.getByLabel("I accept the privacy notice").check();
    await axe(page);
    await page.getByRole("button", { name: "Join the waitlist" }).click();
    await expect(page.getByText("You are #4 in line.")).toBeVisible();
    await shot(page, "waitlist", info.project.name, true);

    await page.getByText("Demo controls").click();
    await page.getByRole("button", { name: "Someone cancels (open a seat)" }).click();
    for (let i = 0; i < 3; i += 1) await page.clock.fastForward("31:00");
    await page.reload();
    await expect(page.getByText("A seat opened for you.")).toBeVisible();
    await axe(page);
    await shot(page, "waitlist-offer", info.project.name, true);
    await page.getByRole("button", { name: "Claim my seats" }).click();
    await expect(page).toHaveURL(/\/checkout\/ord_/);
    await expect(page.getByText("Drip It Up x 1").first()).toBeVisible();
  });
});

test.describe("table deposit", () => {
  test("pay online confirms the booking", async ({ page }) => {
    test.slow();
    await page.goto("/book?outlet=raja-park");
    await page.getByText("Tomorrow", { exact: true }).click();
    await page.getByText("3 PM", { exact: true }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Name").fill("Test guest");
    await page.getByLabel("Phone").fill("90000 00057");
    await page.getByLabel("I accept the privacy notice").check();
    await page.getByRole("button", { name: "Review" }).click();
    await page.getByText("Pay online", { exact: true }).click();
    await page.getByRole("button", { name: "Continue to payment" }).click();

    await expect(page.getByText(/^Table deposit, CRB-\d{4}$/).first()).toBeVisible();
    await page.getByRole("button", { name: "Pay Rs ---" }).click();
    await payWith(page, "Success");
    await expect(page.getByRole("heading", { level: 1, name: "Table's yours." })).toBeVisible();
    await expect(page.getByText("Deposit paid online")).toBeVisible();
  });
});
