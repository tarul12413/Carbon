import { beforeEach, describe, expect, it } from "vitest";
import { seatsLeft, stockState } from "@/domain/events/stock";
import { isFinalOrder, nextOrderStatus, ORDER_STATUSES } from "@/domain/orders/machine";
import type { Order } from "@/domain/orders/schema";
import { signTicket, verifyTicket } from "@/domain/orders/token";
import type { HoldInput } from "@/domain/booking/schema";
import { createMockBackend, memoryStore, type MockBackend } from "@/services/mock/mockBackend";
import { mockOutlets } from "@/services/mock/outlets";

const IST = "Asia/Kolkata";
const START = new Date("2026-10-10T12:00:00+05:30");
let now = START;
let mock: MockBackend;
const t = () => mock.ticketing;
const later = (minutes: number) => {
  now = new Date(now.getTime() + minutes * 60_000);
};

const customer = {
  name: "Test guest",
  phone: "90000 00077",
  whatsappOptIn: true,
  privacyAccepted: true,
  noticeVersion: "draft-0",
  website: "",
};

beforeEach(() => {
  now = START;
  let seed = 7;
  mock = createMockBackend({
    store: memoryStore(),
    outlets: mockOutlets,
    timeZone: IST,
    clock: () => now,
    random: () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  });
});

const order = async (quantity = 2, slug = "coffee-rave", key = `o-${quantity}-${slug}`) => {
  const result = await t().createOrder({ eventSlug: slug, ticketTypeId: "general", quantity }, key);
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
};

const openSheet = async (o: Order, key = `c-${o.id}`) => {
  const result = await t().checkout(o.id, { method: "online", customer }, key);
  if (!result.ok || !result.value.gateway) throw new Error("checkout failed");
  return result.value.gateway.gatewayOrderId;
};

const left = async (slug = "coffee-rave") => {
  const a = await t().getAvailability(slug);
  return a.ok ? a.value.ticketTypes[0]?.left : -1;
};

describe("order state machine", () => {
  it("follows the payment flow", () => {
    expect(nextOrderStatus("held", "capture")).toBe("paid");
    expect(nextOrderStatus("held", "bank_pending")).toBe("awaiting_payment");
    expect(nextOrderStatus("awaiting_payment", "bank_declined")).toBe("held");
    expect(nextOrderStatus("held", "reserve")).toBe("reserved");
    expect(nextOrderStatus("reserved", "settle_at_cafe")).toBe("paid");
    expect(nextOrderStatus("paid", "refund")).toBe("refunded");
    expect(nextOrderStatus("expired", "capture")).toBe("paid");
    expect(nextOrderStatus("expired", "refund")).toBe("refunded");
  });

  it("refuses the rest", () => {
    expect(nextOrderStatus("held", "refund")).toBeNull();
    expect(nextOrderStatus("paid", "capture")).toBeNull();
    expect(nextOrderStatus("refunded", "capture")).toBeNull();
    expect(nextOrderStatus("reserved", "capture")).toBeNull();
    expect(ORDER_STATUSES.filter(isFinalOrder)).toEqual(["cancelled", "refunded"]);
  });
});

describe("stock", () => {
  it("counts sample sales, live holds and offers", () => {
    const type = { id: "general", name: "General", pricePaise: null, quota: 40, seedSold: 33 };
    expect(seatsLeft(type, "x", [], [], START)).toBe(7);
    expect(stockState(7, 40)).toBe("few_left");
    expect(stockState(9, 40)).toBe("on_sale");
    expect(stockState(0, 40)).toBe("sold_out");
  });
});

describe("signed ticket tokens", () => {
  it("verify, and reject any edit", () => {
    const token = signTicket({ c: "CRB-E-3307", e: "coffee-rave", q: 2, i: 1_790_000_000 });
    expect(verifyTicket(token)).toEqual({ c: "CRB-E-3307", e: "coffee-rave", q: 2, i: 1_790_000_000 });
    const [body, sig] = token.split(".");
    const forged = signTicket({ c: "CRB-E-3307", e: "coffee-rave", q: 9, i: 1_790_000_000 }).split(".")[0];
    expect(verifyTicket(`${forged}.${sig}`)).toBeNull();
    expect(verifyTicket(`${body}.${sig}x`)).toBeNull();
    expect(verifyTicket(token, "another-key")).toBeNull();
  });
});

describe("ticket orders", () => {
  it("hold seats for ten minutes, then release them", async () => {
    const o = await order(2);
    expect(o.status).toBe("held");
    expect(o.amountPaise).toBeNull();
    expect(await left()).toBe(5);
    later(10);
    expect(await left()).toBe(7);
    expect((await t().getOrder(o.id)).ok && (await t().getOrder(o.id))).toMatchObject({ value: { status: "expired" } });
  });

  it("refuse more seats than are left, and sold-out events", async () => {
    const tooMany = await t().createOrder({ eventSlug: "coffee-rave", ticketTypeId: "general", quantity: 6 }, "a");
    expect(tooMany.ok).toBe(true);
    const more = await t().createOrder({ eventSlug: "coffee-rave", ticketTypeId: "general", quantity: 2 }, "b");
    expect(!more.ok && more.error).toEqual({ code: "too_many", left: 1 });
    const soldOut = await t().createOrder({ eventSlug: "drip-it-up", ticketTypeId: "general", quantity: 1 }, "c");
    expect(!soldOut.ok && soldOut.error.code).toBe("sold_out");
    const overLimit = await t().createOrder({ eventSlug: "kitchen-rave", ticketTypeId: "general", quantity: 7 }, "d");
    expect(!overLimit.ok && overLimit.error.code).toBe("too_many");
  });

  it("a double tap makes one order", async () => {
    const [a, b] = await Promise.all([order(2, "coffee-rave", "same"), order(2, "coffee-rave", "same")]);
    expect(a.id).toBe(b.id);
    expect(await left()).toBe(5);
  });
});

describe("paying online", () => {
  it("success: the webhook marks it paid and issues one signed ticket", async () => {
    const o = await order(2);
    const gw = await openSheet(o);
    const paid = await mock.gateway.pay(gw, "captured");
    if (!paid.ok || !paid.value.signature) throw new Error("pay failed");
    const verified = await t().verifyPayment(
      o.id,
      { paymentId: paid.value.paymentId, signature: paid.value.signature },
      "v",
    );
    expect(verified.ok && verified.value.status).toBe("paid");
    const code = verified.ok ? verified.value.ticketCode : undefined;
    const ticket = await t().getTicket(code ?? "");
    expect(ticket.ok && ticket.value.ticket).toMatchObject({ quantity: 2, paid: true, status: "valid" });
    expect(ticket.ok && verifyTicket(ticket.value.ticket.token)?.c).toBe(code);
  });

  it("rejects a forged payment signature", async () => {
    const o = await order(1);
    const gw = await openSheet(o);
    const paid = await mock.gateway.pay(gw, "captured");
    if (!paid.ok) throw new Error("pay failed");
    const forged = await t().verifyPayment(o.id, { paymentId: paid.value.paymentId, signature: "forged" }, "v");
    expect(!forged.ok && forged.error.code).toBe("signature_invalid");
  });

  it("failed: the seats stay held and another try works", async () => {
    const o = await order(2);
    const gw = await openSheet(o);
    await mock.gateway.pay(gw, "failed");
    const after = await t().getOrder(o.id);
    expect(after.ok && after.value.status).toBe("held");
    expect(await left()).toBe(5);
    await mock.gateway.pay(gw, "captured");
    const done = await t().getOrder(o.id);
    expect(done.ok && done.value.status).toBe("paid");
    expect(done.ok && done.value.attempts.map((a) => a.outcome)).toEqual(["failed", "captured"]);
  });

  it("pending: the bank's answer arrives later, and a repeated webhook counts once", async () => {
    const o = await order(2);
    const gw = await openSheet(o);
    await mock.gateway.pay(gw, "pending");
    expect((await t().getOrder(o.id)).ok && (await t().getOrder(o.id))).toMatchObject({
      value: { status: "awaiting_payment" },
    });
    const settled = await mock.gateway.settlePending(gw, "captured", true);
    expect(settled.ok && settled.value.status).toBe("paid");
    expect(settled.ok && settled.value.history.filter((h) => h.status === "paid")).toHaveLength(1);
  });

  it("pending then declined goes back to held", async () => {
    const o = await order(1);
    const gw = await openSheet(o);
    await mock.gateway.pay(gw, "pending");
    const settled = await mock.gateway.settlePending(gw, "failed", false);
    expect(settled.ok && settled.value.status).toBe("held");
  });

  it("money after the hold ran out: seats back if free, refund if not", async () => {
    const o = await order(2);
    const gw = await openSheet(o);
    await mock.gateway.pay(gw, "pending");
    later(11);
    const freeSeats = await mock.gateway.settlePending(gw, "captured", false);
    expect(freeSeats.ok && freeSeats.value.status).toBe("paid");

    const o2 = await order(2, "coffee-rave", "second");
    const gw2 = await openSheet(o2);
    await mock.gateway.pay(gw2, "pending");
    later(11);
    await order(5, "coffee-rave", "someone-else");
    const gone = await mock.gateway.settlePending(gw2, "captured", false);
    expect(gone.ok && gone.value).toMatchObject({ status: "refunded", refund: { reason: "seats_gone" } });
  });
});

describe("pay at the cafe", () => {
  it("reserves seats with an unpaid ticket until the deadline", async () => {
    const o = await order(2);
    const result = await t().checkout(o.id, { method: "cafe", customer }, "c");
    expect(result.ok && result.value.order.status).toBe("reserved");
    expect(result.ok && result.value.ticket?.paid).toBe(false);
    now = new Date("2026-10-15T19:00:00+05:30");
    expect(await left()).toBe(7);
    const ticket = result.ok && result.value.ticket ? await t().getTicket(result.value.ticket.code) : null;
    expect(ticket?.ok && ticket.value).toMatchObject({ order: { status: "expired" }, ticket: { status: "cancelled" } });
  });

  it("needs name and phone", async () => {
    const o = await order(1);
    const bad = await t().checkout(o.id, { method: "cafe", customer: { ...customer, phone: "123" } }, "c");
    expect(!bad.ok && bad.error.fields).toEqual({ "customer.phone": "phone.invalid" });
  });
});

describe("cancel and refund", () => {
  const paidTicket = async () => {
    const o = await order(2);
    const gw = await openSheet(o);
    await mock.gateway.pay(gw, "captured");
    const after = await t().getOrder(o.id);
    return after.ok ? (after.value.ticketCode ?? "") : "";
  };

  it("refunds a paid ticket inside the window and frees the seats", async () => {
    const code = await paidTicket();
    const cancelled = await t().cancelTicket(code, "x");
    expect(cancelled.ok && cancelled.value).toMatchObject({
      order: { status: "refunded", refund: { reason: "customer" } },
      ticket: { status: "cancelled" },
    });
    expect(await left()).toBe(7);
  });

  it("refuses after the cutoff", async () => {
    const code = await paidTicket();
    now = new Date(Date.parse("2026-10-15T21:00:00+05:30") - 119 * 60_000);
    const late = await t().cancelTicket(code, "x");
    expect(!late.ok && late.error.code).toBe("cutoff_passed");
  });
});

describe("waitlist", () => {
  const join = (phone: string, key = phone) =>
    t().joinWaitlist({ eventSlug: "drip-it-up", ticketTypeId: "general", quantity: 1, ...customer, phone }, key);

  it("only for sold-out events, and shows the place in line", async () => {
    const onSale = await t().joinWaitlist(
      { eventSlug: "coffee-rave", ticketTypeId: "general", quantity: 1, ...customer },
      "a",
    );
    expect(!onSale.ok && onSale.error.code).toBe("not_allowed");
    const joined = await join("90000 00081");
    expect(joined.ok && joined.value.position).toBe(4);
    const again = await join("90000 00081", "another-key");
    expect(again.ok && again.value.entry.id).toBe(joined.ok && joined.value.entry.id);
  });

  it("offers an opened seat to the first in line, then the next when the claim window lapses", async () => {
    const mine = await join("90000 00081");
    if (!mine.ok) throw new Error("join failed");
    await mock.demo.openSeat("drip-it-up");
    for (let i = 0; i < 3; i += 1) {
      const first = await t().getWaitlistEntry(mine.value.entry.id);
      expect(first.ok && first.value.entry.status).toBe("waiting");
      later(31);
    }
    const offered = await t().getWaitlistEntry(mine.value.entry.id);
    expect(offered.ok && offered.value.entry.status).toBe("offered");
    expect(await left("drip-it-up")).toBe(0);

    const claim = await t().createOrder(
      { eventSlug: "drip-it-up", ticketTypeId: "general", quantity: 1, waitlistId: mine.value.entry.id },
      "claim",
    );
    expect(claim.ok && claim.value.status).toBe("held");
    const status = await t().getWaitlistEntry(mine.value.entry.id);
    expect(status.ok && status.value).toMatchObject({ entry: { status: "claimed" }, position: null });
  });

  it("catches up on claim windows that lapsed while nobody was looking", async () => {
    const mine = await join("90000 00082");
    if (!mine.ok) throw new Error("join failed");
    await mock.demo.openSeat("drip-it-up");
    later(91);
    const offered = await t().getWaitlistEntry(mine.value.entry.id);
    expect(offered.ok && offered.value.entry).toMatchObject({
      status: "offered",
      offerExpiresAt: new Date(START.getTime() + 120 * 60_000).toISOString(),
    });
  });

  it("someone else cannot take a seat that is offered", async () => {
    await mock.demo.openSeat("drip-it-up");
    const grab = await t().createOrder({ eventSlug: "drip-it-up", ticketTypeId: "general", quantity: 1 }, "grab");
    expect(!grab.ok && grab.error.code).toBe("sold_out");
  });
});

describe("table deposit", () => {
  const holdTable = async (partySize = 2) => {
    const input: HoldInput = {
      outlet: "c-scheme",
      date: "2026-10-12",
      time: "13:00",
      partySize,
      name: "Test guest",
      phone: "90000 00078",
      note: "",
      whatsappOptIn: false,
      privacyAccepted: true,
      noticeVersion: "draft-0",
      website: "",
    };
    const held = await mock.bookings.createHold(input, `hold-${partySize}`);
    if (!held.ok) throw new Error("hold failed");
    return held.value.code;
  };

  it("paying it confirms the booking; cancelling refunds it", async () => {
    const code = await holdTable();
    const deposit = await t().createDepositOrder({ bookingCode: code }, "d");
    if (!deposit.ok) throw new Error("deposit failed");
    const again = await t().createDepositOrder({ bookingCode: code }, "d2");
    expect(again.ok && again.value.id).toBe(deposit.value.id);
    const cafe = await t().checkout(deposit.value.id, { method: "cafe" }, "cafe");
    expect(!cafe.ok && cafe.error.code).toBe("not_allowed");
    const gw = await t().checkout(deposit.value.id, { method: "online" }, "c");
    if (!gw.ok || !gw.value.gateway) throw new Error("checkout failed");
    await mock.gateway.pay(gw.value.gateway.gatewayOrderId, "captured");
    const booking = await mock.bookings.getBooking(code);
    expect(booking.ok && booking.value).toMatchObject({ status: "confirmed", payment: "online" });

    await mock.bookings.cancel(code, "cancel");
    const refunded = await t().getOrder(deposit.value.id);
    expect(refunded.ok && refunded.value).toMatchObject({ status: "refunded", refund: { reason: "customer" } });
  });

  it("money that arrives after the table hold ran out is refunded", async () => {
    const code = await holdTable();
    const deposit = await t().createDepositOrder({ bookingCode: code }, "d");
    if (!deposit.ok) throw new Error("deposit failed");
    const gw = await t().checkout(deposit.value.id, { method: "online" }, "c");
    if (!gw.ok || !gw.value.gateway) throw new Error("checkout failed");
    await mock.gateway.pay(gw.value.gateway.gatewayOrderId, "pending");
    later(11);
    const late = await mock.gateway.settlePending(gw.value.gateway.gatewayOrderId, "captured", false);
    expect(late.ok && late.value).toMatchObject({ status: "refunded", refund: { reason: "booking_expired" } });
    const booking = await mock.bookings.getBooking(code);
    expect(booking.ok && booking.value.status).toBe("expired");
  });
});
