import { beforeEach, describe, expect, it } from "vitest";
import { CARD_RULES, balance, canStamp, undoable } from "@/domain/loyalty/card";
import { canRequestOtp, checkOtp, hashOtp } from "@/domain/loyalty/otp";
import { readStampQr, signStampQr } from "@/domain/loyalty/qr";
import type { OtpChallenge, StampEntry } from "@/domain/loyalty/schema";
import { signClaims, verifyTicket } from "@/domain/orders/token";
import type { StaffActor } from "@/domain/staff";
import { createMockBackend, memoryStore, type MockBackend } from "@/services/mock/mockBackend";
import { mockOutlets } from "@/services/mock/outlets";

const IST = "Asia/Kolkata";
const START = new Date("2026-10-10T12:00:00+05:30");
let now = START;
let mock: MockBackend;
const later = (minutes: number) => {
  now = new Date(now.getTime() + minutes * 60_000);
};

const barista: StaffActor = { staffId: "stf-barista-c-scheme", outlet: "c-scheme" };
const consent = { privacyAccepted: true, noticeVersion: "draft-0", website: "" };

beforeEach(() => {
  now = START;
  let seed = 11;
  mock = createMockBackend({
    store: memoryStore(),
    outlets: mockOutlets,
    timeZone: IST,
    clock: () => now,
    random: () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  });
});

let keys = 0;
const key = () => `k-${(keys += 1)}`;

const signIn = async (phone = "90000 00088") => {
  const challenge = await mock.loyalty.requestOtp({ phone, ...consent }, key());
  if (!challenge.ok || !challenge.value.demoCode) throw new Error("otp request failed");
  const signedIn = await mock.loyalty.verifyOtp(
    { challengeId: challenge.value.challengeId, code: challenge.value.demoCode },
    key(),
  );
  if (!signedIn.ok) throw new Error(signedIn.error.code);
  return signedIn.value.session;
};

const scan = async (session: string) => {
  const qr = await mock.loyalty.getQr(session);
  if (!qr.ok) throw new Error(qr.error.code);
  const card = await mock.staff.findCard(barista, { token: qr.value.token });
  if (!card.ok) throw new Error(card.error.code);
  return card.value;
};

describe("stamp card rules", () => {
  const visit = (at: Date, id = `stp_${at.getTime()}`.slice(0, 14).padEnd(14, "0")): StampEntry => ({
    id,
    customerId: "c",
    delta: 1,
    reason: "visit",
    outlet: "c-scheme",
    staffId: "s",
    at: at.toISOString(),
  });

  it("keeps a minimum gap between stamps", () => {
    const ledger = [visit(START)];
    const soon = canStamp(ledger, "c", new Date(START.getTime() + (CARD_RULES.minGapMinutes - 1) * 60_000));
    expect(soon).toMatchObject({ ok: false, reason: "too_soon" });
    expect(canStamp(ledger, "c", new Date(START.getTime() + CARD_RULES.minGapMinutes * 60_000))).toEqual({ ok: true });
  });

  it("stops at a full card", () => {
    const ledger = Array.from({ length: CARD_RULES.threshold }, (_, i) =>
      visit(new Date(START.getTime() - (i + 1) * 86_400_000), `stp_${String(i).padStart(10, "0")}`),
    );
    expect(balance(ledger, "c")).toBe(CARD_RULES.threshold);
    expect(canStamp(ledger, "c", START)).toEqual({ ok: false, reason: "card_full" });
  });

  it("lets only the latest stamp be undone, and only for a short time", () => {
    const ledger = [visit(START)];
    expect(undoable(ledger, "c", START)?.entry.id).toBe(ledger[0]?.id);
    expect(undoable(ledger, "c", new Date(START.getTime() + CARD_RULES.undoMinutes * 60_000))).toBeNull();
  });
});

describe("sign-in codes", () => {
  const challenge = (createdAt: Date, phone = "+919000000088"): OtpChallenge => ({
    id: "otp_aaaaaaaaaa",
    phone,
    codeHash: hashOtp("otp_aaaaaaaaaa", "123456"),
    consent: { noticeVersion: "draft-0", at: createdAt.toISOString() },
    attempts: 0,
    usedAt: null,
    expiresAt: new Date(createdAt.getTime() + 5 * 60_000).toISOString(),
    createdAt: createdAt.toISOString(),
  });

  it("are stored hashed, never as typed", () => {
    expect(challenge(START).codeHash).not.toContain("123456");
    expect(challenge(START).codeHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("wait 30 seconds between sends and allow 3 an hour", () => {
    const first = challenge(START);
    expect(canRequestOtp([first], first.phone, new Date(START.getTime() + 10_000)).ok).toBe(false);
    const three = [0, 1, 2].map((i) => challenge(new Date(START.getTime() + i * 60_000)));
    const check = canRequestOtp(three, first.phone, new Date(START.getTime() + 10 * 60_000));
    expect(check).toEqual({ ok: false, retryAt: new Date(START.getTime() + 60 * 60_000).toISOString() });
    expect(canRequestOtp(three, "+919000000099", START).ok).toBe(true);
  });

  it("lock after 5 wrong tries and run out after 5 minutes", () => {
    const c = challenge(START);
    for (let i = 4; i >= 1; i -= 1)
      expect(checkOtp(c, "000000", START)).toEqual({ ok: false, reason: "otp_invalid", attemptsLeft: i });
    expect(checkOtp(c, "000000", START)).toEqual({ ok: false, reason: "otp_locked" });
    expect(checkOtp(c, "123456", START)).toEqual({ ok: false, reason: "otp_locked" });
    expect(checkOtp(challenge(START), "123456", new Date(START.getTime() + 5 * 60_000))).toEqual({
      ok: false,
      reason: "otp_expired",
    });
  });

  it("work once", () => {
    const c = challenge(START);
    expect(checkOtp(c, "123456", START)).toEqual({ ok: true });
    expect(checkOtp(c, "123456", START)).toEqual({ ok: false, reason: "otp_expired" });
  });
});

describe("stamp QR", () => {
  it("lasts 60 seconds", () => {
    const { token } = signStampQr("cus_x", START);
    expect(readStampQr(token, new Date(START.getTime() + 59_000))).toEqual({ ok: true, customerId: "cus_x" });
    expect(readStampQr(token, new Date(START.getTime() + 60_000))).toEqual({ ok: false, reason: "token_expired" });
  });

  it("cannot be forged, and is never read as a ticket", () => {
    const { token } = signStampQr("cus_x", START);
    const forged = signClaims({ k: "stamp", u: "cus_y", x: 9e9 }, "some-other-key");
    expect(readStampQr(forged, START)).toEqual({ ok: false, reason: "signature_invalid" });
    expect(verifyTicket(token)).toBeNull();
  });
});

describe("stamp card service", () => {
  it("signs in with a code, records consent, and starts empty", async () => {
    const session = await signIn();
    const card = await mock.loyalty.getCard(session);
    expect(card.ok && card.value).toMatchObject({
      stamps: 0,
      threshold: 8,
      rewardReady: false,
      phoneMasked: "+91 ••••• •0088",
    });
  });

  it("needs consent and a real mobile number before sending a code", async () => {
    const bad = await mock.loyalty.requestOtp(
      { phone: "12345", privacyAccepted: false, noticeVersion: "draft-0", website: "" },
      key(),
    );
    expect(!bad.ok && bad.error.fields).toEqual({ phone: "phone.invalid", privacyAccepted: "consent.required" });
    const bot = await mock.loyalty.requestOtp({ phone: "90000 00088", ...consent, website: "spam" }, key());
    expect(!bot.ok && bot.error.code).toBe("bot_check");
  });

  it("a double scan cannot add two stamps", async () => {
    const session = await signIn();
    const card = await scan(session);
    const first = await mock.staff.addStamp(barista, card.customerId, "tap-1");
    const replay = await mock.staff.addStamp(barista, card.customerId, "tap-1");
    expect(first.ok && first.value.stamps).toBe(1);
    expect(replay).toEqual(first);
    const second = await mock.staff.addStamp(barista, card.customerId, "tap-2");
    expect(!second.ok && second.error.code).toBe("too_soon");
  });

  it("undo takes the stamp back once, inside the window", async () => {
    const session = await signIn();
    const { customerId } = await scan(session);
    const added = await mock.staff.addStamp(barista, customerId, key());
    if (!added.ok || !added.value.undo) throw new Error("no undo");
    const undone = await mock.staff.undoStamp(barista, added.value.undo.entryId, key());
    expect(undone.ok && undone.value.stamps).toBe(0);
    const again = await mock.staff.undoStamp(barista, added.value.undo.entryId, key());
    expect(!again.ok && again.error.code).toBe("not_allowed");
  });

  it("expired QRs are refused; the barista can look up by phone", async () => {
    const session = await signIn();
    const qr = await mock.loyalty.getQr(session);
    if (!qr.ok) throw new Error();
    later(1.5);
    const stale = await mock.staff.findCard(barista, { token: qr.value.token });
    expect(!stale.ok && stale.error.code).toBe("token_expired");
    const byPhone = await mock.staff.findCard(barista, { phone: "+91 90000 00088" });
    expect(byPhone.ok).toBe(true);
  });

  it("a full card redeems once with the outlet PIN", async () => {
    const card = await mock.staff.findCard(barista, { phone: "90000 00202" });
    if (!card.ok) throw new Error();
    expect(card.value).toMatchObject({ stamps: 8, rewardReady: true, name: "Sample guest B" });
    const wrong = await mock.staff.redeem(barista, card.value.customerId, "0000", key());
    expect(!wrong.ok && wrong.error.code).toBe("pin_invalid");
    const redeemed = await mock.staff.redeem(barista, card.value.customerId, "1896", "redeem-1");
    expect(redeemed.ok && redeemed.value.stamps).toBe(0);
    expect(await mock.staff.redeem(barista, card.value.customerId, "1896", "redeem-1")).toEqual(redeemed);
    const twice = await mock.staff.redeem(barista, card.value.customerId, "1896", "redeem-2");
    expect(!twice.ok && twice.error.code).toBe("not_enough_stamps");
  });

  it("only baristas and owners stamp, and only at their outlet", async () => {
    const card = await mock.staff.findCard(barista, { phone: "90000 00201" });
    if (!card.ok) throw new Error();
    const elsewhere = await mock.staff.addStamp(
      { staffId: "stf-barista-raja-park", outlet: "c-scheme" },
      card.value.customerId,
      key(),
    );
    expect(!elsewhere.ok && elsewhere.error.code).toBe("forbidden");
    const marketing = await mock.staff.findCard(
      { staffId: "stf-marketing", outlet: "c-scheme" },
      { phone: "90000 00201" },
    );
    expect(!marketing.ok && marketing.error.code).toBe("forbidden");
    const owner = await mock.staff.addStamp(
      { staffId: "stf-owner", outlet: "raja-park" },
      card.value.customerId,
      key(),
    );
    expect(owner.ok && owner.value.stamps).toBe(6);
  });

  it("deleting the card removes the customer and their history", async () => {
    const session = await signIn();
    const { customerId } = await scan(session);
    await mock.staff.addStamp(barista, customerId, key());
    expect((await mock.loyalty.deleteCard(session)).ok).toBe(true);
    const gone = await mock.loyalty.getCard(session);
    expect(!gone.ok && gone.error.code).toBe("session_expired");
    const lookup = await mock.staff.findCard(barista, { phone: "90000 00088" });
    expect(!lookup.ok && lookup.error.code).toBe("not_found");
    const fresh = await signIn();
    const card = await mock.loyalty.getCard(fresh);
    expect(card.ok && card.value.stamps).toBe(0);
  });
});

describe("door check-in", () => {
  const door: StaffActor = { staffId: "stf-manager-c-scheme", outlet: "c-scheme" };
  const buyer = { name: "Test guest", phone: "90000 00077", whatsappOptIn: false, ...consent };

  const ticket = async (method: "online" | "cafe") => {
    const order = await mock.ticketing.createOrder(
      { eventSlug: "coffee-rave", ticketTypeId: "general", quantity: 2 },
      key(),
    );
    if (!order.ok) throw new Error(order.error.code);
    const result = await mock.ticketing.checkout(order.value.id, { method, customer: buyer }, key());
    if (!result.ok) throw new Error(result.error.code);
    if (method === "cafe") return result.value.ticket!;
    await mock.gateway.pay(result.value.gateway!.gatewayOrderId, "captured");
    const view = await mock.ticketing.getOrder(order.value.id);
    if (!view.ok || !view.value.ticketCode) throw new Error("no ticket");
    const t = await mock.ticketing.getTicket(view.value.ticketCode);
    if (!t.ok) throw new Error();
    return t.value.ticket;
  };

  it("checks a paid ticket in once", async () => {
    const t = await ticket("online");
    const found = await mock.staff.findTicket(door, { token: t.token });
    expect(found.ok && found.value).toMatchObject({ paid: true, ticket: { code: t.code, checkedInAt: null } });
    const first = await mock.staff.checkIn(door, t.code, false, key());
    expect(first.ok && first.value.ticket.checkedInBy).toBe(door.staffId);
    const again = await mock.staff.checkIn(door, t.code, false, key());
    expect(!again.ok && again.error.code).toBe("already_used");
    const cancel = await mock.ticketing.cancelTicket(t.code, key());
    expect(!cancel.ok && cancel.error.code).toBe("not_allowed");
  });

  it("collects a pay-at-cafe ticket before letting it in", async () => {
    const t = await ticket("cafe");
    const unpaid = await mock.staff.findTicket(door, { code: t.code.toLowerCase() });
    expect(unpaid.ok && unpaid.value.paid).toBe(false);
    const refused = await mock.staff.checkIn(door, t.code, false, key());
    expect(!refused.ok && refused.error.code).toBe("not_allowed");
    const paid = await mock.staff.checkIn(door, t.code, true, key());
    expect(paid.ok && paid.value.order.status).toBe("paid");
  });

  it("refuses forged and cancelled tickets", async () => {
    const forged = await mock.staff.findTicket(door, {
      token: signClaims({ c: "CRB-E-1234", e: "coffee-rave", q: 9, i: 0 }, "x"),
    });
    expect(!forged.ok && forged.error.code).toBe("signature_invalid");
    const t = await ticket("online");
    await mock.ticketing.cancelTicket(t.code, key());
    const cancelled = await mock.staff.checkIn(door, t.code, false, key());
    expect(!cancelled.ok && cancelled.error.code).toBe("not_allowed");
  });
});
