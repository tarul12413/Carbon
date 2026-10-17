import { alternativeSlots, bookableDates, slotsFor, isBookable } from "@/domain/booking/availability";
import { newBookingCode } from "@/domain/booking/code";
import { nextStatus, type BookingEvent } from "@/domain/booking/machine";
import { bookingKind, canChangeOrCancel, findDuplicate } from "@/domain/booking/rules";
import {
  availabilityQuerySchema,
  changeInputSchema,
  confirmInputSchema,
  holdInputSchema,
  requestInputSchema,
  type Booking,
} from "@/domain/booking/schema";
import { bookingSettingsFor, type BookingSettings } from "@/domain/booking/settings";
import { toMinutes, type DailyHours } from "@/domain/hours";
import type { Outlet, OutletSlug } from "@/domain/outlet";
import { zonedInstant } from "@/domain/time";
import { err, ok } from "@/lib/result";
import type { Availability, BookingResult } from "../bookings";
import type { ServiceError } from "../errors";
import { invalidInput as invalid, type EngineContext, type MockDb } from "./db";
import { refundDeposit } from "./ordersEngine";

/**
 * The mock booking server. Pure functions over a plain database object, so the same rules run in
 * the browser (hosted demo, D-004) and behind the route handlers (local runs and tests).
 * Each call runs synchronously from load to save, which is what makes a hold atomic here;
 * Phase 2 gets the same guarantee from a database transaction that locks the slot.
 */

const outletOf = (ctx: EngineContext, slug: string) => ctx.outlets.find((o) => o.slug === slug);

/** The placeholders, with anything saved in admin for this outlet on top (capacity, hours, blackouts). */
export function settingsOf(db: MockDb, slug: OutletSlug): BookingSettings {
  const saved = db.outletSettings[slug];
  const settings = bookingSettingsFor(slug);
  return saved ? { ...settings, capacityPerSlot: saved.capacityPerSlot } : settings;
}

export function hoursOf(db: MockDb, outlet: Outlet): DailyHours {
  const saved = db.outletSettings[outlet.slug];
  return saved ? { open: saved.open, close: saved.close } : outlet.hours;
}

export const closedDates = (db: MockDb, slug: OutletSlug): string[] =>
  (db.outletSettings[slug]?.blackouts ?? []).map((b) => b.date);

const contextFor = (db: MockDb, ctx: EngineContext, outlet: Outlet) => ({
  hours: hoursOf(db, outlet),
  settings: settingsOf(db, outlet.slug),
  now: ctx.now,
  timeZone: ctx.timeZone,
  closed: closedDates(db, outlet.slug),
});

function transition(booking: Booking, event: BookingEvent, now: Date): boolean {
  const status = nextStatus(booking.status, event);
  if (!status) return false;
  booking.status = status;
  booking.history.push({ status, at: now.toISOString() });
  return true;
}

/** Holds past their expiry become expired. Runs before every read and write. */
export function sweepExpiredHolds(db: MockDb, now: Date): number {
  let count = 0;
  for (const booking of db.bookings) {
    if (booking.status === "held" && Date.parse(booking.holdExpiresAt) <= now.getTime()) {
      transition(booking, "expire", now);
      count += 1;
    }
  }
  return count;
}

export function listDates(ctx: EngineContext, outlet: Outlet): string[] {
  return bookableDates(ctx.now, ctx.timeZone, bookingSettingsFor(outlet.slug));
}

export function getAvailability(db: MockDb, ctx: EngineContext, raw: unknown): BookingResult<Availability> {
  const parsed = availabilityQuerySchema.safeParse(raw);
  if (!parsed.success) return err(invalid(parsed.error.issues));
  const query = parsed.data;
  const outlet = outletOf(ctx, query.outlet);
  if (!outlet) return err({ code: "not_found" });
  const settings = settingsOf(db, outlet.slug);
  if (!listDates(ctx, outlet).includes(query.date)) return err({ code: "outside_window" });
  return ok({
    ...query,
    kind: bookingKind(query.partySize, settings),
    ...(closedDates(db, outlet.slug).includes(query.date) ? { closed: true } : {}),
    slots: slotsFor({ ...query, ignoreCode: query.excludeCode }, db.bookings, contextFor(db, ctx, outlet)),
  });
}

/** Checks a date, time and party against the rules; returns the slot error, if any. */
function checkSlot(
  db: MockDb,
  ctx: EngineContext,
  outlet: Outlet,
  want: { readonly date: string; readonly time: string; readonly partySize: number },
  ignoreCode?: string,
): ServiceError | null {
  const settings = settingsOf(db, outlet.slug);
  if (want.partySize > settings.maxPartySize) return { code: "party_too_large" };
  if (!listDates(ctx, outlet).includes(want.date)) return { code: "outside_window" };
  const slot = slotsFor({ outlet: outlet.slug, ...want, ignoreCode }, db.bookings, contextFor(db, ctx, outlet)).find(
    (s) => s.time === want.time,
  );
  if (!slot || slot.state === "past") return { code: "outside_window" };
  if (!isBookable(slot)) {
    return {
      code: "slot_full",
      alternatives: alternativeSlots({ outlet: outlet.slug, ...want }, db.bookings, contextFor(db, ctx, outlet)),
    };
  }
  return null;
}

export function createHold(db: MockDb, ctx: EngineContext, raw: unknown): BookingResult {
  const parsed = holdInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalid(parsed.error.issues));
  const input = parsed.data;
  const outlet = outletOf(ctx, input.outlet);
  if (!outlet) return err({ code: "not_found" });

  const duplicate = findDuplicate(db.bookings, input, ctx.now);
  if (duplicate) return ok(duplicate);

  const problem = checkSlot(db, ctx, outlet, input);
  if (problem) return err(problem);

  const settings = settingsOf(db, outlet.slug);
  const at = ctx.now.toISOString();
  const booking: Booking = {
    code: newBookingCode(new Set(db.bookings.map((b) => b.code)), ctx.random),
    outlet: outlet.slug,
    date: input.date,
    time: input.time,
    startsAt: zonedInstant(input.date, toMinutes(input.time), ctx.timeZone).toISOString(),
    partySize: input.partySize,
    kind: bookingKind(input.partySize, settings),
    status: "held",
    name: input.name,
    phone: input.phone,
    note: input.note,
    whatsappOptIn: input.whatsappOptIn,
    consent: { noticeVersion: input.noticeVersion, at },
    holdExpiresAt: new Date(ctx.now.getTime() + settings.holdMinutes * 60_000).toISOString(),
    source: "web",
    createdAt: at,
    history: [{ status: "held", at }],
  };
  db.bookings.push(booking);
  return ok(booking);
}

function findLive(db: MockDb, code: string): BookingResult {
  const booking = db.bookings.find((b) => b.code === code);
  return booking ? ok(booking) : err({ code: "not_found" });
}

/** A held booking moving on: refused once the hold has run out. */
function finishHold(
  db: MockDb,
  ctx: EngineContext,
  code: string,
  event: "confirm" | "request",
  update: (booking: Booking) => void,
): BookingResult {
  const found = findLive(db, code);
  if (!found.ok) return found;
  const booking = found.value;
  if (booking.status === "expired") return err({ code: "hold_expired" });
  const expectedKind = event === "confirm" ? "instant" : "request";
  if (booking.kind !== expectedKind || !nextStatus(booking.status, event)) return err({ code: "not_allowed" });
  update(booking);
  transition(booking, event, ctx.now);
  return ok(booking);
}

export function confirm(db: MockDb, ctx: EngineContext, code: string, raw: unknown): BookingResult {
  const parsed = confirmInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalid(parsed.error.issues));
  return finishHold(db, ctx, code, "confirm", (b) => {
    b.payment = parsed.data.payment;
  });
}

export function sendRequest(db: MockDb, ctx: EngineContext, code: string, raw: unknown): BookingResult {
  const parsed = requestInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalid(parsed.error.issues));
  return finishHold(db, ctx, code, "request", (b) => {
    b.request = parsed.data;
  });
}

/**
 * Cancels a confirmed booking before the cutoff. On a live hold it releases the table instead
 * (the flow does this when someone goes back and changes the slot); the machine calls that expired.
 */
export function cancel(db: MockDb, ctx: EngineContext, code: string): BookingResult {
  const found = findLive(db, code);
  if (!found.ok) return found;
  const booking = found.value;
  if (booking.status === "held") {
    transition(booking, "expire", ctx.now);
    return ok(booking);
  }
  if (booking.status !== "confirmed") return err({ code: "not_allowed" });
  if (!canChangeOrCancel(booking, ctx.now, settingsOf(db, booking.outlet))) return err({ code: "cutoff_passed" });
  transition(booking, "cancel", ctx.now);
  if (booking.payment === "online") refundDeposit(db, ctx, booking.code);
  return ok(booking);
}

/** Moves a confirmed booking to a new slot. Its own seats do not count against the new slot. */
export function change(db: MockDb, ctx: EngineContext, code: string, raw: unknown): BookingResult {
  const parsed = changeInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalid(parsed.error.issues));
  const found = findLive(db, code);
  if (!found.ok) return found;
  const booking = found.value;
  const outlet = outletOf(ctx, booking.outlet);
  if (!outlet) return err({ code: "not_found" });
  if (booking.status !== "confirmed") return err({ code: "not_allowed" });
  if (!canChangeOrCancel(booking, ctx.now, settingsOf(db, booking.outlet))) return err({ code: "cutoff_passed" });
  const problem = checkSlot(db, ctx, outlet, { ...parsed.data, partySize: booking.partySize }, booking.code);
  if (problem) return err(problem);
  booking.date = parsed.data.date;
  booking.time = parsed.data.time;
  booking.startsAt = zonedInstant(booking.date, toMinutes(booking.time), ctx.timeZone).toISOString();
  booking.history.push({ status: "confirmed", at: ctx.now.toISOString() });
  return ok(booking);
}

export function getBooking(db: MockDb, code: string): BookingResult {
  return findLive(db, code);
}

/** Demo panel: end every live hold now. */
export function expireHolds(db: MockDb, ctx: EngineContext): number {
  for (const booking of db.bookings) {
    if (booking.status === "held") booking.holdExpiresAt = ctx.now.toISOString();
  }
  return sweepExpiredHolds(db, ctx.now);
}
