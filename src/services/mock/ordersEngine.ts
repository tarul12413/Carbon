import { placeholders } from "@/config/placeholders";
import { nextStatus as nextBookingStatus } from "@/domain/booking/machine";
import { seatsLeft, stockState } from "@/domain/events/stock";
import type { EventInfo, TicketType } from "@/domain/events/types";
import { nextToOffer, positionInLine } from "@/domain/events/waitlist";
import { nextOrderStatus, type OrderEvent } from "@/domain/orders/machine";
import {
  checkoutInputSchema,
  createOrderInputSchema,
  depositOrderInputSchema,
  joinWaitlistInputSchema,
  type Order,
  type Ticket,
  type WebhookEvent,
} from "@/domain/orders/schema";
import { DEMO_GATEWAY_KEY, sameSignature, signTicket, signature } from "@/domain/orders/token";
import { err, ok } from "@/lib/result";
import type { ServiceResult } from "../errors";
import type {
  CheckoutResult,
  EventAvailability,
  PaymentOutcome,
  PaymentProof,
  TicketView,
  WaitlistStatus,
} from "../ticketing";
import { invalidInput, randomId, type EngineContext, type MockDb } from "./db";

/**
 * The mock ticketing server: orders, the sample gateway's webhooks, tickets and the waitlist.
 * Same rules as the booking engine: pure functions over the database, run in one step per call.
 */

const minutes = (n: number) => n * 60_000;

const eventOf = (ctx: EngineContext, slug: string | undefined) => ctx.events.find((e) => e.slug === slug);

/** A ticket type with the demo's "someone cancelled" seats taken off its sample sales. */
function effectiveType(db: MockDb, event: EventInfo, type: TicketType): TicketType {
  const released = db.released[`${event.slug}:${type.id}`] ?? 0;
  return { ...type, seedSold: Math.max(0, type.seedSold - released) };
}

function left(db: MockDb, ctx: EngineContext, event: EventInfo, type: TicketType): number {
  return seatsLeft(effectiveType(db, event, type), event.slug, db.orders, db.waitlist, ctx.now);
}

function transition(order: Order, event: OrderEvent, now: Date): boolean {
  const status = nextOrderStatus(order.status, event);
  if (!status) return false;
  order.status = status;
  order.history.push({ status, at: now.toISOString() });
  return true;
}

function newTicketCode(db: MockDb, random: () => number): string {
  const taken = new Set(db.tickets.map((t) => t.code));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = `CRB-E-${1000 + Math.floor(random() * 9000)}`;
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not find a free ticket code");
}

function issueTicket(db: MockDb, ctx: EngineContext, order: Order, paid: boolean): Ticket {
  const existing = db.tickets.find((t) => t.orderId === order.id);
  if (existing) {
    existing.paid = paid;
    return existing;
  }
  const code = newTicketCode(db, ctx.random);
  const ticket: Ticket = {
    code,
    orderId: order.id,
    eventSlug: order.eventSlug ?? "",
    quantity: order.quantity,
    token: signTicket({
      c: code,
      e: order.eventSlug ?? "",
      q: order.quantity,
      i: Math.floor(ctx.now.getTime() / 1000),
    }),
    paid,
    status: "valid",
    checkedInAt: null,
    issuedAt: ctx.now.toISOString(),
  };
  db.tickets.push(ticket);
  order.ticketCode = code;
  return ticket;
}

/** Seats that opened go to the waitlist first, one person at a time (Blueprint section 9). */
export function offerOpenSeats(db: MockDb, ctx: EngineContext, from: Date = ctx.now): void {
  for (const event of ctx.events) {
    for (const type of event.ticketTypes) {
      let open = left(db, ctx, event, type);
      let next = nextToOffer(db.waitlist, event.slug, type.id, open);
      while (next) {
        next.status = "offered";
        next.offerExpiresAt = new Date(from.getTime() + minutes(placeholders.waitlistClaimMinutes.value)).toISOString();
        open -= next.quantity;
        next = nextToOffer(db.waitlist, event.slug, type.id, open);
      }
    }
  }
}

/** Expiry checks run before every call: holds, pay-at-cafe deadlines and waitlist offers. */
export function sweepOrders(db: MockDb, ctx: EngineContext): void {
  const now = ctx.now.getTime();
  for (const order of db.orders) {
    const holdOver = Date.parse(order.holdExpiresAt) <= now;
    if ((order.status === "held" || order.status === "awaiting_payment") && holdOver) {
      transition(order, "expire", ctx.now);
    }
    if (order.status === "reserved" && order.cafeDeadline && Date.parse(order.cafeDeadline) <= now) {
      transition(order, "expire", ctx.now);
      const ticket = db.tickets.find((t) => t.orderId === order.id);
      if (ticket) ticket.status = "cancelled";
    }
  }
  /* Claim windows chain: the next offer starts when the last one lapsed, as a background job would do it. */
  for (;;) {
    const lapsed = db.waitlist
      .filter((w) => w.status === "offered" && w.offerExpiresAt && Date.parse(w.offerExpiresAt) <= now)
      .sort((a, b) => (a.offerExpiresAt ?? "").localeCompare(b.offerExpiresAt ?? ""))[0];
    if (!lapsed?.offerExpiresAt) break;
    lapsed.status = "lapsed";
    offerOpenSeats(db, ctx, new Date(lapsed.offerExpiresAt));
  }
  offerOpenSeats(db, ctx);
}

export function getAvailability(db: MockDb, ctx: EngineContext, slug: string): ServiceResult<EventAvailability> {
  const event = eventOf(ctx, slug);
  if (!event) return err({ code: "not_found" });
  return ok({
    slug,
    ticketTypes: event.ticketTypes.map((type) => {
      const seats = left(db, ctx, event, type);
      return { id: type.id, name: type.name, quota: type.quota, left: seats, state: stockState(seats, type.quota) };
    }),
    waitlistLength: db.waitlist.filter(
      (w) => w.eventSlug === slug && (w.status === "waiting" || w.status === "offered"),
    ).length,
  });
}

function newOrder(
  ctx: EngineContext,
  fields: Omit<Order, "id" | "status" | "attempts" | "createdAt" | "history">,
): Order {
  const at = ctx.now.toISOString();
  return {
    id: randomId("ord", ctx.random),
    status: "held",
    attempts: [],
    createdAt: at,
    history: [{ status: "held", at }],
    ...fields,
  };
}

export function createOrder(db: MockDb, ctx: EngineContext, raw: unknown): ServiceResult<Order> {
  const parsed = createOrderInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const input = parsed.data;
  const event = eventOf(ctx, input.eventSlug);
  const type = event?.ticketTypes.find((t) => t.id === input.ticketTypeId);
  if (!event || !type) return err({ code: "not_found" });
  if (Date.parse(event.startsAt) <= ctx.now.getTime()) return err({ code: "outside_window" });
  if (input.quantity > placeholders.ticketsPerOrderMax.value) return err({ code: "too_many" });

  if (input.waitlistId) {
    const entry = db.waitlist.find((w) => w.id === input.waitlistId);
    if (!entry || entry.eventSlug !== event.slug || entry.status !== "offered") return err({ code: "not_allowed" });
    if (input.quantity > entry.quantity) return err({ code: "too_many", left: entry.quantity });
    entry.status = "claimed";
  } else {
    const seats = left(db, ctx, event, type);
    if (seats === 0) return err({ code: "sold_out" });
    if (input.quantity > seats) return err({ code: "too_many", left: seats });
  }

  const order = newOrder(ctx, {
    kind: "tickets",
    eventSlug: event.slug,
    ticketTypeId: type.id,
    quantity: input.quantity,
    startsAt: event.startsAt,
    amountPaise: type.pricePaise === null ? null : type.pricePaise * input.quantity,
    holdExpiresAt: new Date(ctx.now.getTime() + minutes(placeholders.holdMinutes.value)).toISOString(),
    ...(input.waitlistId ? { waitlistId: input.waitlistId } : {}),
  });
  db.orders.push(order);
  return ok(order);
}

/** A table deposit (P-04) for a live instant hold. One order per hold: asking again returns it. */
export function createDepositOrder(db: MockDb, ctx: EngineContext, raw: unknown): ServiceResult<Order> {
  const parsed = depositOrderInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const booking = db.bookings.find((b) => b.code === parsed.data.bookingCode);
  if (!booking) return err({ code: "not_found" });
  if (booking.status === "expired") return err({ code: "hold_expired" });
  if (booking.status !== "held" || booking.kind !== "instant") return err({ code: "not_allowed" });
  const existing = db.orders.find((o) => o.bookingCode === booking.code && o.status === "held");
  if (existing) return ok(existing);
  const order = newOrder(ctx, {
    kind: "deposit",
    bookingCode: booking.code,
    quantity: 1,
    startsAt: booking.startsAt,
    amountPaise: null,
    holdExpiresAt: booking.holdExpiresAt,
    customer: {
      name: booking.name,
      phone: booking.phone,
      whatsappOptIn: booking.whatsappOptIn,
      consent: booking.consent,
    },
  });
  db.orders.push(order);
  return ok(order);
}

const findOrder = (db: MockDb, id: string): ServiceResult<Order> => {
  const order = db.orders.find((o) => o.id === id);
  return order ? ok(order) : err({ code: "not_found" });
};

export function getOrder(db: MockDb, id: string): ServiceResult<Order> {
  return findOrder(db, id);
}

/** Pay-at-cafe seats are kept until a deadline before the start (P-22), and never less than a normal hold. */
function cafeDeadline(order: Order, ctx: EngineContext): string {
  const beforeStart = Date.parse(order.startsAt) - placeholders.payAtCafeDeadline.value.demoHours * 60 * 60_000;
  const atLeast = ctx.now.getTime() + minutes(placeholders.holdMinutes.value);
  return new Date(Math.max(beforeStart, atLeast)).toISOString();
}

export function checkout(db: MockDb, ctx: EngineContext, id: string, raw: unknown): ServiceResult<CheckoutResult> {
  const parsed = checkoutInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const found = findOrder(db, id);
  if (!found.ok) return found;
  const order = found.value;
  if (order.status === "expired") return err({ code: "hold_expired" });
  if (order.status !== "held") return err({ code: "not_allowed" });

  const input = parsed.data;
  if (order.kind === "tickets") {
    if (!input.customer) return err({ code: "invalid_input", fields: { customer: "name.required" } });
    order.customer = {
      name: input.customer.name,
      phone: input.customer.phone,
      whatsappOptIn: input.customer.whatsappOptIn,
      consent: { noticeVersion: input.customer.noticeVersion, at: ctx.now.toISOString() },
    };
  }

  if (input.method === "cafe") {
    if (order.kind === "deposit") return err({ code: "not_allowed" });
    order.method = "cafe";
    order.cafeDeadline = cafeDeadline(order, ctx);
    transition(order, "reserve", ctx.now);
    return ok({ order, ticket: issueTicket(db, ctx, order, false) });
  }

  order.method = "online";
  order.gatewayOrderId ??= randomId("gw", ctx.random);
  const event = eventOf(ctx, order.eventSlug);
  return ok({
    order,
    gateway: {
      gatewayOrderId: order.gatewayOrderId,
      description:
        order.kind === "deposit"
          ? `Table deposit, ${order.bookingCode}`
          : `${event?.title ?? "Event"} x ${order.quantity}`,
      amountPaise: order.amountPaise,
    },
  });
}

/** What the gateway signs: our gateway order id and its payment id (Razorpay's pattern). */
const paymentSignature = (gatewayOrderId: string, paymentId: string) =>
  signature(`${gatewayOrderId}|${paymentId}`, DEMO_GATEWAY_KEY);

export function verifyPayment(db: MockDb, id: string, proof: PaymentProof): ServiceResult<Order> {
  const found = findOrder(db, id);
  if (!found.ok) return found;
  const order = found.value;
  const attempt = order.attempts.find((a) => a.paymentId === proof.paymentId);
  if (!order.gatewayOrderId || !attempt) return err({ code: "signature_invalid" });
  if (!sameSignature(proof.signature, paymentSignature(order.gatewayOrderId, proof.paymentId))) {
    return err({ code: "signature_invalid" });
  }
  return ok(order);
}

function refund(order: Order, reason: NonNullable<Order["refund"]>["reason"], now: Date): void {
  if (transition(order, "refund", now)) order.refund = { at: now.toISOString(), reason };
}

/** Money arrived: hand over what was paid for, or give it back if that is no longer possible. */
function fulfil(db: MockDb, ctx: EngineContext, order: Order): void {
  if (order.kind === "deposit") {
    const booking = db.bookings.find((b) => b.code === order.bookingCode);
    const live = booking?.status === "held" && Date.parse(booking.holdExpiresAt) > ctx.now.getTime();
    if (!booking || !live) {
      /* The table went back while the bank was deciding: return the money (Blueprint 11). */
      if (order.status !== "expired") transition(order, "capture", ctx.now);
      refund(order, "booking_expired", ctx.now);
      return;
    }
    transition(order, "capture", ctx.now);
    const status = nextBookingStatus(booking.status, "confirm");
    if (status) {
      booking.status = status;
      booking.payment = "online";
      booking.history.push({ status, at: ctx.now.toISOString() });
    }
    return;
  }

  if (order.status === "expired") {
    const event = eventOf(ctx, order.eventSlug);
    const type = event?.ticketTypes.find((t) => t.id === order.ticketTypeId);
    const seats = event && type ? left(db, ctx, event, type) : 0;
    if (seats < order.quantity) {
      refund(order, "seats_gone", ctx.now);
      return;
    }
  }
  transition(order, "capture", ctx.now);
  issueTicket(db, ctx, order, true);
}

/**
 * The payment webhook: the source of truth (Blueprint step 6). Each event id is handled once;
 * the order's state decides what an event can still do, so late or repeated events are harmless.
 */
export function handleWebhook(
  db: MockDb,
  ctx: EngineContext,
  event: Omit<WebhookEvent, "receivedAt">,
): ServiceResult<Order> {
  const order = db.orders.find((o) => o.gatewayOrderId === event.gatewayOrderId);
  if (!order) return err({ code: "not_found" });
  if (db.webhooks.some((w) => w.id === event.id)) return ok(order);
  db.webhooks.push({ ...event, receivedAt: ctx.now.toISOString() });

  const attempt = order.attempts.find((a) => a.paymentId === event.paymentId);
  if (event.type === "payment.pending") {
    transition(order, "bank_pending", ctx.now);
  } else if (event.type === "payment.failed") {
    if (attempt) attempt.outcome = "failed";
    transition(order, "bank_declined", ctx.now);
  } else if (order.status === "held" || order.status === "awaiting_payment" || order.status === "expired") {
    if (attempt) attempt.outcome = "captured";
    fulfil(db, ctx, order);
  }
  return ok(order);
}

/** The sample sheet's Pay button: records the attempt and has the "gateway" send its webhook. */
export function gatewayPay(
  db: MockDb,
  ctx: EngineContext,
  gatewayOrderId: string,
  outcome: PaymentOutcome,
): ServiceResult<{ paymentId: string; signature?: string }> {
  const order = db.orders.find((o) => o.gatewayOrderId === gatewayOrderId);
  if (!order) return err({ code: "not_found" });
  if (order.status === "expired") return err({ code: "hold_expired" });
  if (order.status !== "held") return err({ code: "not_allowed" });
  const paymentId = randomId("pay", ctx.random);
  order.attempts.push({ paymentId, outcome, at: ctx.now.toISOString() });
  const type =
    outcome === "captured" ? "payment.captured" : outcome === "failed" ? "payment.failed" : "payment.pending";
  handleWebhook(db, ctx, { id: randomId("evt", ctx.random), type, gatewayOrderId, paymentId });
  return ok(
    outcome === "captured" ? { paymentId, signature: paymentSignature(gatewayOrderId, paymentId) } : { paymentId },
  );
}

/** The bank answers a pending UPI payment, possibly delivering the same webhook twice. */
export function gatewaySettle(
  db: MockDb,
  ctx: EngineContext,
  gatewayOrderId: string,
  outcome: "captured" | "failed",
  twice: boolean,
): ServiceResult<Order> {
  const order = db.orders.find((o) => o.gatewayOrderId === gatewayOrderId);
  if (!order) return err({ code: "not_found" });
  const attempt = [...order.attempts].reverse().find((a) => a.outcome === "pending");
  if (!attempt) return err({ code: "not_allowed" });
  const event = {
    id: randomId("evt", ctx.random),
    type: outcome === "captured" ? ("payment.captured" as const) : ("payment.failed" as const),
    gatewayOrderId,
    paymentId: attempt.paymentId,
  };
  const result = handleWebhook(db, ctx, event);
  return twice ? handleWebhook(db, ctx, event) : result;
}

export function getTicket(db: MockDb, code: string): ServiceResult<TicketView> {
  const ticket = db.tickets.find((t) => t.code === code);
  const order = ticket && db.orders.find((o) => o.id === ticket.orderId);
  return ticket && order ? ok({ ticket, order }) : err({ code: "not_found" });
}

/** Cancel within the window (P-05): paid orders are refunded, pay-at-cafe ones are let go. */
export function cancelTicket(db: MockDb, ctx: EngineContext, code: string): ServiceResult<TicketView> {
  const found = getTicket(db, code);
  if (!found.ok) return found;
  const { ticket, order } = found.value;
  if (ticket.status !== "valid" || ticket.checkedInAt) return err({ code: "not_allowed" });
  const cutoff = placeholders.cancellationWindow.value.demoHours * 60 * 60_000;
  if (Date.parse(order.startsAt) - ctx.now.getTime() < cutoff) return err({ code: "cutoff_passed" });
  if (order.status === "paid") refund(order, "customer", ctx.now);
  else if (!transition(order, "cancel", ctx.now)) return err({ code: "not_allowed" });
  ticket.status = "cancelled";
  offerOpenSeats(db, ctx);
  return ok({ ticket, order });
}

/** Refunds the paid deposit when its table booking is cancelled. */
export function refundDeposit(db: MockDb, ctx: EngineContext, bookingCode: string): void {
  const order = db.orders.find((o) => o.bookingCode === bookingCode && o.status === "paid");
  if (order) refund(order, "customer", ctx.now);
}

function waitlistStatus(db: MockDb, id: string): ServiceResult<WaitlistStatus> {
  const entry = db.waitlist.find((w) => w.id === id);
  return entry ? ok({ entry, position: positionInLine(db.waitlist, entry) }) : err({ code: "not_found" });
}

export function joinWaitlist(db: MockDb, ctx: EngineContext, raw: unknown): ServiceResult<WaitlistStatus> {
  const parsed = joinWaitlistInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const input = parsed.data;
  const event = eventOf(ctx, input.eventSlug);
  const type = event?.ticketTypes.find((t) => t.id === input.ticketTypeId);
  if (!event || !type) return err({ code: "not_found" });
  if (input.quantity > placeholders.ticketsPerOrderMax.value) return err({ code: "too_many" });
  if (left(db, ctx, event, type) > 0) return err({ code: "not_allowed" });
  const already = db.waitlist.find(
    (w) => w.eventSlug === event.slug && w.phone === input.phone && (w.status === "waiting" || w.status === "offered"),
  );
  if (already) return waitlistStatus(db, already.id);
  const entry = {
    id: randomId("wl", ctx.random),
    eventSlug: event.slug,
    ticketTypeId: type.id,
    quantity: input.quantity,
    phone: input.phone,
    whatsappOptIn: input.whatsappOptIn,
    consent: { noticeVersion: input.noticeVersion, at: ctx.now.toISOString() },
    status: "waiting" as const,
    source: "web" as const,
    createdAt: ctx.now.toISOString(),
  };
  db.waitlist.push(entry);
  return waitlistStatus(db, entry.id);
}

export function getWaitlistEntry(db: MockDb, id: string): ServiceResult<WaitlistStatus> {
  return waitlistStatus(db, id);
}

/** Demo control: someone with a sample ticket cancels, so one seat opens. */
export function openSeat(db: MockDb, ctx: EngineContext, slug: string): number {
  const event = eventOf(ctx, slug);
  const type = event?.ticketTypes[0];
  if (!event || !type) return 0;
  const key = `${event.slug}:${type.id}`;
  db.released[key] = Math.min(type.seedSold, (db.released[key] ?? 0) + 1);
  offerOpenSeats(db, ctx);
  return left(db, ctx, event, type);
}
