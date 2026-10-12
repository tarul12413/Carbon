import { placeholders } from "@/config/placeholders";
import { maskIndianMobile, normalizeIndianMobile } from "@/domain/booking/phone";
import { CARD_RULES, balance, canStamp, entriesFor, lastStamp, rewardReady, undoable } from "@/domain/loyalty/card";
import { OTP_RETENTION_MS, OTP_RULES, canRequestOtp, checkOtp, hashOtp, newOtpCode } from "@/domain/loyalty/otp";
import { readStampQr, signStampQr } from "@/domain/loyalty/qr";
import { otpRequestInputSchema, otpVerifyInputSchema, type AuditEntry, type Customer } from "@/domain/loyalty/schema";
import { nextOrderStatus } from "@/domain/orders/machine";
import type { Order } from "@/domain/orders/schema";
import { verifyTicket } from "@/domain/orders/token";
import { staffById, staffCan, type StaffActor, type StaffMember } from "@/domain/staff";
import { err, ok } from "@/lib/result";
import type { ServiceError, ServiceResult } from "../errors";
import type { OtpChallengeView, SignedIn, StampCard, StampQr } from "../loyalty";
import type { CardLookup, DoorView, StaffCardView, TicketLookup } from "../staff";
import { invalidInput, randomId, type EngineContext, type MockDb } from "./db";

/**
 * The mock stamp card and door scanner: OTP sign-in, the rotating QR, the stamp ledger, rewards and
 * ticket check-in (Blueprint section 9). Pure functions over the database, one step per call.
 */

const SESSION_DAYS = 30;
const days = (n: number) => n * 24 * 60 * 60_000;

/** Drops sign-in codes older than a day and sessions past their end (Blueprint section 12). */
export function sweepLoyalty(db: MockDb, ctx: EngineContext): void {
  const now = ctx.now.getTime();
  db.otpChallenges = db.otpChallenges.filter((c) => now - Date.parse(c.createdAt) < OTP_RETENTION_MS);
  db.sessions = db.sessions.filter((s) => Date.parse(s.expiresAt) > now);
}

/* Customer side */

export function requestOtp(db: MockDb, ctx: EngineContext, raw: unknown): ServiceResult<OtpChallengeView> {
  const parsed = otpRequestInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const { phone, noticeVersion } = parsed.data;
  const allowed = canRequestOtp(db.otpChallenges, phone, ctx.now);
  if (!allowed.ok) return err({ code: "rate_limited", retryAt: allowed.retryAt });

  const id = randomId("otp", ctx.random);
  const code = newOtpCode(ctx.random);
  const at = ctx.now.toISOString();
  const expiresAt = new Date(ctx.now.getTime() + OTP_RULES.validMinutes * 60_000).toISOString();
  db.otpChallenges.push({
    id,
    phone,
    codeHash: hashOtp(id, code),
    consent: { noticeVersion, at },
    attempts: 0,
    usedAt: null,
    expiresAt,
    createdAt: at,
  });
  return ok({
    challengeId: id,
    phoneMasked: maskIndianMobile(phone),
    expiresAt,
    resendAt: new Date(ctx.now.getTime() + OTP_RULES.resendSeconds * 1000).toISOString(),
    demoCode: code,
  });
}

function card(db: MockDb, customer: Customer): StampCard {
  const stamps = balance(db.stamps, customer.id);
  return {
    phoneMasked: maskIndianMobile(customer.phone),
    ...(customer.name ? { name: customer.name } : {}),
    stamps,
    threshold: CARD_RULES.threshold,
    rewardReady: rewardReady(stamps),
    rewardsRedeemed: db.rewards.filter((r) => r.customerId === customer.id && r.redeemedAt).length,
    history: entriesFor(db.stamps, customer.id)
      .map((e) => ({ at: e.at, reason: e.reason, delta: e.delta, outlet: e.outlet }))
      .reverse(),
  };
}

export function verifyOtp(db: MockDb, ctx: EngineContext, raw: unknown): ServiceResult<SignedIn> {
  const parsed = otpVerifyInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const challenge = db.otpChallenges.find((c) => c.id === parsed.data.challengeId);
  if (!challenge) return err({ code: "otp_expired" });
  const check = checkOtp(challenge, parsed.data.code, ctx.now);
  if (!check.ok) {
    return err(
      check.reason === "otp_invalid"
        ? { code: "otp_invalid", attemptsLeft: check.attemptsLeft }
        : { code: check.reason },
    );
  }

  let customer = db.customers.find((c) => c.phone === challenge.phone);
  if (customer) customer.consent = challenge.consent;
  else {
    customer = {
      id: randomId("cus", ctx.random),
      phone: challenge.phone,
      consent: challenge.consent,
      source: "web",
      createdAt: ctx.now.toISOString(),
    };
    db.customers.push(customer);
  }
  const session = {
    id: randomId("ses", ctx.random),
    customerId: customer.id,
    expiresAt: new Date(ctx.now.getTime() + days(SESSION_DAYS)).toISOString(),
  };
  db.sessions.push(session);
  return ok({ session: session.id, card: card(db, customer) });
}

/** The session's customer, sliding the session's end forward. */
function signedIn(db: MockDb, ctx: EngineContext, sessionId: string): Customer | ServiceError {
  const session = db.sessions.find((s) => s.id === sessionId);
  const customer = session && db.customers.find((c) => c.id === session.customerId);
  if (!session || !customer) return { code: "session_expired" };
  session.expiresAt = new Date(ctx.now.getTime() + days(SESSION_DAYS)).toISOString();
  return customer;
}

const isError = (value: object): value is ServiceError => "code" in value && !("id" in value);

export function getCard(db: MockDb, ctx: EngineContext, session: string): ServiceResult<StampCard> {
  const customer = signedIn(db, ctx, session);
  return isError(customer) ? err(customer) : ok(card(db, customer));
}

export function getQr(db: MockDb, ctx: EngineContext, session: string): ServiceResult<StampQr> {
  const customer = signedIn(db, ctx, session);
  return isError(customer) ? err(customer) : ok(signStampQr(customer.id, ctx.now));
}

export function signOut(db: MockDb, session: string): ServiceResult<null> {
  db.sessions = db.sessions.filter((s) => s.id !== session);
  return ok(null);
}

/** Erasure on request (Blueprint section 12): the customer, their ledger, rewards and sessions. */
export function deleteCard(db: MockDb, ctx: EngineContext, session: string): ServiceResult<null> {
  const customer = signedIn(db, ctx, session);
  if (isError(customer)) return err(customer);
  const id = customer.id;
  db.customers = db.customers.filter((c) => c.id !== id);
  db.stamps = db.stamps.filter((e) => e.customerId !== id);
  db.rewards = db.rewards.filter((r) => r.customerId !== id);
  db.sessions = db.sessions.filter((s) => s.customerId !== id);
  db.otpChallenges = db.otpChallenges.filter((c) => c.phone !== customer.phone);
  for (const entry of db.audit) if (entry.entity === id) entry.entity = "deleted";
  return ok(null);
}

/* Staff side */

function staffFor(actor: StaffActor, action: "stamp" | "checkIn"): StaffMember | ServiceError {
  const staff = staffById(actor.staffId);
  if (!staff || !staffCan(staff, action, actor.outlet)) return { code: "forbidden" };
  return staff;
}

function log(db: MockDb, ctx: EngineContext, actor: StaffActor, action: AuditEntry["action"], entity: string): void {
  db.audit.push({ at: ctx.now.toISOString(), staffId: actor.staffId, outlet: actor.outlet, action, entity });
}

function staffView(db: MockDb, ctx: EngineContext, customer: Customer): StaffCardView {
  const stamps = balance(db.stamps, customer.id);
  const check = canStamp(db.stamps, customer.id, ctx.now);
  const undo = undoable(db.stamps, customer.id, ctx.now);
  return {
    customerId: customer.id,
    ...(customer.name ? { name: customer.name } : {}),
    phoneMasked: maskIndianMobile(customer.phone),
    stamps,
    threshold: CARD_RULES.threshold,
    rewardReady: rewardReady(stamps),
    lastStampAt: lastStamp(db.stamps, customer.id)?.at ?? null,
    nextStampAt: !check.ok && check.reason === "too_soon" ? check.nextAt : null,
    undo: undo ? { entryId: undo.entry.id, until: undo.until } : null,
  };
}

export function findCard(
  db: MockDb,
  ctx: EngineContext,
  actor: StaffActor,
  lookup: CardLookup,
): ServiceResult<StaffCardView> {
  const staff = staffFor(actor, "stamp");
  if (isError(staff)) return err(staff);
  let customer: Customer | undefined;
  if ("token" in lookup) {
    const read = readStampQr(lookup.token, ctx.now);
    if (!read.ok) return err({ code: read.reason });
    customer = db.customers.find((c) => c.id === read.customerId);
  } else {
    const phone = normalizeIndianMobile(lookup.phone);
    if (!phone) return err({ code: "invalid_input", fields: { phone: "phone.invalid" } });
    customer = db.customers.find((c) => c.phone === phone);
  }
  return customer ? ok(staffView(db, ctx, customer)) : err({ code: "not_found" });
}

export function addStamp(
  db: MockDb,
  ctx: EngineContext,
  actor: StaffActor,
  customerId: string,
): ServiceResult<StaffCardView> {
  const staff = staffFor(actor, "stamp");
  if (isError(staff)) return err(staff);
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return err({ code: "not_found" });
  const check = canStamp(db.stamps, customer.id, ctx.now);
  if (!check.ok) {
    return err(
      check.reason === "too_soon"
        ? { code: "too_soon", lastAt: check.lastAt, nextAt: check.nextAt }
        : { code: "card_full" },
    );
  }
  const id = randomId("stp", ctx.random);
  db.stamps.push({
    id,
    customerId,
    delta: 1,
    reason: "visit",
    outlet: actor.outlet,
    staffId: actor.staffId,
    at: ctx.now.toISOString(),
  });
  log(db, ctx, actor, "stamp.add", customerId);
  return ok(staffView(db, ctx, customer));
}

export function undoStamp(
  db: MockDb,
  ctx: EngineContext,
  actor: StaffActor,
  entryId: string,
): ServiceResult<StaffCardView> {
  const staff = staffFor(actor, "stamp");
  if (isError(staff)) return err(staff);
  const entry = db.stamps.find((e) => e.id === entryId);
  const customer = entry && db.customers.find((c) => c.id === entry.customerId);
  if (!entry || !customer) return err({ code: "not_found" });
  if (undoable(db.stamps, customer.id, ctx.now)?.entry.id !== entry.id) return err({ code: "not_allowed" });
  db.stamps.push({
    id: randomId("stp", ctx.random),
    customerId: customer.id,
    delta: -1,
    reason: "undo",
    undoes: entry.id,
    outlet: actor.outlet,
    staffId: actor.staffId,
    at: ctx.now.toISOString(),
  });
  log(db, ctx, actor, "stamp.undo", customer.id);
  return ok(staffView(db, ctx, customer));
}

/** The mock outlet PIN (P-28). Phase 2 checks a hashed PIN per outlet on the server. */
const pinMatches = (pin: string) => pin === placeholders.outletPin.value;

export function redeem(
  db: MockDb,
  ctx: EngineContext,
  actor: StaffActor,
  customerId: string,
  pin: string,
): ServiceResult<StaffCardView> {
  const staff = staffFor(actor, "stamp");
  if (isError(staff)) return err(staff);
  const customer = db.customers.find((c) => c.id === customerId);
  if (!customer) return err({ code: "not_found" });
  if (!pinMatches(pin)) {
    log(db, ctx, actor, "redeem.pin_wrong", customerId);
    return err({ code: "pin_invalid" });
  }
  if (!rewardReady(balance(db.stamps, customerId))) return err({ code: "not_enough_stamps" });
  const filledAt = lastStamp(db.stamps, customerId)?.at ?? ctx.now.toISOString();
  db.stamps.push({
    id: randomId("stp", ctx.random),
    customerId,
    delta: -CARD_RULES.threshold,
    reason: "redeem",
    outlet: actor.outlet,
    staffId: actor.staffId,
    at: ctx.now.toISOString(),
  });
  db.rewards.push({
    id: randomId("rwd", ctx.random),
    customerId,
    issuedAt: filledAt,
    redeemedAt: ctx.now.toISOString(),
    staffId: actor.staffId,
    outlet: actor.outlet,
  });
  log(db, ctx, actor, "reward.redeem", customerId);
  return ok(staffView(db, ctx, customer));
}

/* The door */

function doorView(db: MockDb, code: string): DoorView | null {
  const ticket = db.tickets.find((t) => t.code === code);
  const order = ticket && db.orders.find((o) => o.id === ticket.orderId);
  return ticket && order ? { ticket, order, paid: order.status === "paid" } : null;
}

export function findTicket(db: MockDb, actor: StaffActor, lookup: TicketLookup): ServiceResult<DoorView> {
  const staff = staffFor(actor, "checkIn");
  if (isError(staff)) return err(staff);
  let code: string;
  if ("token" in lookup) {
    const claims = verifyTicket(lookup.token.trim());
    if (!claims) return err({ code: "signature_invalid" });
    code = claims.c;
  } else code = lookup.code.trim().toUpperCase();
  const view = doorView(db, code);
  return view ? ok(view) : err({ code: "not_found" });
}

const usable = (order: Order) => order.status === "paid" || order.status === "reserved";

/** Each ticket checks in once (Blueprint section 9: tickets.checked_in_at). */
export function checkIn(
  db: MockDb,
  ctx: EngineContext,
  actor: StaffActor,
  code: string,
  collected: boolean,
): ServiceResult<DoorView> {
  const staff = staffFor(actor, "checkIn");
  if (isError(staff)) return err(staff);
  const view = doorView(db, code);
  if (!view) return err({ code: "not_found" });
  const { ticket, order } = view;
  if (ticket.status !== "valid" || !usable(order)) return err({ code: "not_allowed" });
  if (ticket.checkedInAt) return err({ code: "already_used" });
  if (order.status === "reserved") {
    if (!collected) return err({ code: "not_allowed" });
    const status = nextOrderStatus(order.status, "settle_at_cafe");
    if (!status) return err({ code: "not_allowed" });
    order.status = status;
    order.history.push({ status, at: ctx.now.toISOString() });
    ticket.paid = true;
    log(db, ctx, actor, "ticket.paid_at_door", ticket.code);
  }
  ticket.checkedInAt = ctx.now.toISOString();
  ticket.checkedInBy = actor.staffId;
  log(db, ctx, actor, "ticket.check_in", ticket.code);
  return ok({ ticket, order, paid: true });
}
