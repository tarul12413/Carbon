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

/** The stamp card ships behind a flag that is off by default; these tests need a build with it on. */
async function needsStampCard(page: Page) {
  const response = await page.goto("/my-carbon");
  test.skip(response?.status() === 404, "Build with NEXT_PUBLIC_FLAG_STAMP_CARD=true to test the stamp card");
}

async function signIn(page: Page, phone: string, info?: { project: { name: string } }) {
  await page.getByLabel("Mobile number").fill(phone);
  await page.getByLabel(/I agree to this notice/).check();
  if (info) {
    await axe(page);
    await shot(page, "stamp-phone", info.project.name, true);
  }
  await page.getByRole("button", { name: "Send OTP" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Enter the code" })).toBeVisible();
  const toast = await page.getByText(/Your Carbon code is \d{6}/).textContent();
  const code = /\d{6}/.exec(toast ?? "")?.[0] ?? "";
  if (info) {
    await axe(page);
    await shot(page, "stamp-otp", info.project.name);
  }
  await page.getByLabel("Digit 1 of 6").fill(code);
  await page.getByRole("button", { name: "Verify" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "My Carbon" })).toBeVisible();
}

test.describe("stamp card", () => {
  test("sign in, show the QR, and the barista stamps it", async ({ page, context }, info) => {
    test.slow();
    await needsStampCard(page);
    await signIn(page, "90000 00092", info);
    await expect(page.getByText("0 of 8 stamps")).toBeVisible();
    await page.getByRole("button", { name: "Show QR to barista" }).click();
    await expect(page.getByRole("img", { name: "Your stamp card QR" })).toBeVisible();
    await expect(page.getByText(/New code in \d+s/)).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "stamp-card", info.project.name, true);

    const staff = await context.newPage();
    await staff.goto("/staff");
    await expect(staff.getByRole("heading", { level: 1, name: "Scan a card" })).toBeVisible();
    await axe(staff);
    await fitsScreen(staff);
    await shot(staff, "staff-scan", info.project.name, true);
    await staff.getByRole("button", { name: "Simulate scan" }).click();
    await expect(staff.getByRole("heading", { level: 1, name: "+91 ••••• •0092" })).toBeVisible();
    await expect(staff.getByText("No stamps yet")).toBeVisible();
    await staff.getByRole("button", { name: "Add stamp" }).click();
    await expect(staff.getByText("Stamp added. 1 of 8.")).toBeVisible();
    await expect(staff.getByRole("button", { name: "Add stamp" })).toBeDisabled();
    await expect(staff.getByText(/Too soon for another/)).toBeVisible();
    await axe(staff);
    await shot(staff, "staff-stamp", info.project.name, true);

    await expect(page.getByText("1 of 8 stamps")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Stamp added. 1 of 8.")).toBeAttached();

    await staff.getByRole("button", { name: "Undo last" }).click();
    await expect(staff.getByText("Stamp taken back.")).toBeVisible();
    await expect(page.getByText("0 of 8 stamps")).toBeVisible({ timeout: 10_000 });
  });

  test("a wrong code says how many tries are left; the card can be deleted", async ({ page }) => {
    await needsStampCard(page);
    await page.getByLabel("Mobile number").fill("90000 00093");
    await page.getByRole("button", { name: "Send OTP" }).click();
    await expect(page.getByText("Please agree to the notice first, so we can send the code.")).toBeVisible();
    await page.getByLabel(/I agree to this notice/).check();
    await page.getByRole("button", { name: "Send OTP" }).click();
    await page.getByLabel("Digit 1 of 6").fill("000000");
    await page.getByRole("button", { name: "Verify" }).click();
    await expect(page.getByText("That code doesn't match. 4 tries left.")).toBeVisible();

    await page.getByRole("button", { name: "Wrong number?" }).click();
    await signIn(page, "90000 00094");
    await page.getByRole("button", { name: "Delete my card" }).click();
    await page.getByRole("button", { name: "Delete it" }).click();
    await expect(page.getByText("Card deleted. Your number is gone from the stamp card.")).toBeVisible();
    await expect(page.getByLabel("Mobile number")).toBeVisible();
  });

  test("a full card redeems with the outlet PIN", async ({ page }, info) => {
    await needsStampCard(page);
    await page.goto("/staff");
    await page.getByRole("button", { name: "Enter phone number instead" }).click();
    await page.getByLabel("Customer's mobile number").fill("90000 00202");
    await page.getByRole("button", { name: "Find" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Reward ready" })).toBeVisible();
    await axe(page);
    await shot(page, "staff-redeem", info.project.name, true);
    await page.getByLabel("Digit 1 of 4").fill("0000");
    await page.getByRole("button", { name: "Redeem reward" }).click();
    await expect(page.getByText("Wrong outlet PIN.")).toBeVisible();
    await page.getByLabel("Digit 1 of 4").fill("1896");
    await page.getByRole("button", { name: "Redeem reward" }).click();
    await expect(page.getByText("Redeemed. The card starts again.")).toBeVisible();
    await expect(page.getByText("0 of 8", { exact: true })).toBeVisible();
  });

  test("marketing accounts can't stamp", async ({ page }) => {
    await needsStampCard(page);
    await page.goto("/staff");
    await page.getByLabel("Signed in as").selectOption({ label: "Marketing, all outlets" });
    await expect(page.getByText("This account can't do that at this outlet.")).toBeVisible();
  });
});

test.describe("event door", () => {
  test("checks a ticket in once", async ({ page }, info) => {
    test.slow();
    await page.goto("/events/coffee-rave");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Name").fill("Test guest");
    await page.getByLabel("Phone").fill("90000 00058");
    await page.getByLabel("I accept the privacy notice").check();
    await page.getByRole("button", { name: "Pay Rs ---" }).click();
    const sheet = page.getByRole("dialog", { name: "Sample payment sheet" });
    await sheet.getByText("Success", { exact: true }).click();
    await sheet.getByRole("button", { name: /^Pay / }).click();
    await expect(page.getByRole("heading", { level: 1, name: "You're in." })).toBeVisible();
    const code = (await page.getByText(/^CRB-E-\d{4}$/).textContent()) ?? "";

    await page.goto("/staff");
    const door = page.getByRole("button", { name: "Event door" });
    if (await door.isVisible()) await door.click();
    await expect(page.getByRole("heading", { level: 1, name: "Scan a ticket" })).toBeVisible();
    await page.getByRole("button", { name: "Simulate scan" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Coffee Rave x 2" })).toBeVisible();
    await expect(page.getByText("Paid", { exact: true })).toBeVisible();
    await axe(page);
    await fitsScreen(page);
    await shot(page, "staff-door", info.project.name, true);
    await page.getByRole("button", { name: "Check in 2" }).click();
    await expect(page.getByText("Checked in.")).toBeVisible();

    await page.getByRole("button", { name: "Scan another" }).click();
    await page.getByRole("button", { name: "Enter ticket code instead" }).click();
    await page.getByLabel("Ticket code").fill(code.toLowerCase());
    await page.getByRole("button", { name: "Find" }).click();
    await expect(page.getByText(/^Already checked in, /)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Check in/ })).toHaveCount(0);

    await page.goto(`/tickets/${code}`);
    await expect(page.getByRole("link", { name: "Cancel this ticket" })).toBeVisible();
  });
});
