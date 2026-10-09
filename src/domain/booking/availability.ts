import { toMinutes, type DailyHours } from "@/domain/hours";
import { addDays, localDate, toHHMM, zonedInstant } from "@/domain/time";
import type { Booking } from "./schema";
import type { BookingSettings } from "./settings";

/**
 * Availability math (Blueprint section 9, booking rules): a slot's free seats are its capacity
 * minus the party sizes of confirmed bookings and live instant holds whose dwell overlaps it.
 * Requests do not take seats until staff approve them.
 */

export type SlotState = "open" | "low" | "full" | "past";

export interface Slot {
  readonly time: string;
  readonly remaining: number;
  readonly state: SlotState;
}

export interface AvailabilityContext {
  readonly hours: DailyHours;
  readonly settings: BookingSettings;
  readonly now: Date;
  readonly timeZone: string;
}

/** Start times on the slot grid whose whole dwell fits before closing. */
export function slotTimes(hours: DailyHours, settings: BookingSettings): string[] {
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close) <= open ? 24 * 60 : toMinutes(hours.close);
  const times: string[] = [];
  for (let start = open; start + settings.dwellMinutes <= close; start += settings.slotMinutes) {
    times.push(toHHMM(start));
  }
  return times;
}

/** Whether a booking is holding seats right now. */
export function takesSeats(booking: Booking, now: Date): boolean {
  if (booking.status === "confirmed") return true;
  return booking.status === "held" && booking.kind === "instant" && Date.parse(booking.holdExpiresAt) > now.getTime();
}

const overlaps = (a: number, b: number, dwell: number) => a < b + dwell && b < a + dwell;

export function seatsTaken(
  bookings: readonly Booking[],
  where: { readonly outlet: string; readonly date: string; readonly time: string },
  settings: BookingSettings,
  now: Date,
  ignoreCode?: string,
): number {
  const start = toMinutes(where.time);
  return bookings
    .filter(
      (b) =>
        b.code !== ignoreCode &&
        b.outlet === where.outlet &&
        b.date === where.date &&
        takesSeats(b, now) &&
        overlaps(toMinutes(b.time), start, settings.dwellMinutes),
    )
    .reduce((sum, b) => sum + b.partySize, 0);
}

/** First local date and time a booking can start, given the lead time. */
export function earliestStart(now: Date, settings: BookingSettings): Date {
  return new Date(now.getTime() + settings.minLeadMinutes * 60_000);
}

/** Dates a table can be booked for: today through `maxDaysAhead` days from now. */
export function bookableDates(now: Date, timeZone: string, settings: BookingSettings): string[] {
  const today = localDate(now, timeZone);
  return Array.from({ length: settings.maxDaysAhead + 1 }, (_, i) => addDays(today, i));
}

export function slotsFor(
  query: { readonly outlet: string; readonly date: string; readonly partySize: number; readonly ignoreCode?: string },
  bookings: readonly Booking[],
  ctx: AvailabilityContext,
): Slot[] {
  const { settings, now, timeZone } = ctx;
  const earliest = earliestStart(now, settings).getTime();
  const instant = query.partySize <= settings.instantMaxPartySize;

  return slotTimes(ctx.hours, settings).map((time) => {
    const remaining = Math.max(
      0,
      settings.capacityPerSlot -
        seatsTaken(bookings, { outlet: query.outlet, date: query.date, time }, settings, now, query.ignoreCode),
    );
    const startsAt = zonedInstant(query.date, toMinutes(time), timeZone).getTime();
    let state: SlotState = "open";
    if (startsAt < earliest) state = "past";
    else if (instant && remaining < query.partySize) state = "full";
    else if (instant && remaining - query.partySize < settings.instantMaxPartySize) state = "low";
    return { time, remaining, state };
  });
}

export const isBookable = (slot: Slot) => slot.state === "open" || slot.state === "low";

/**
 * Next bookable slots after a clash (Blueprint 11: "offers the other the next best slots"):
 * closest times on the same day first, then the following days.
 */
export function alternativeSlots(
  query: { readonly outlet: string; readonly date: string; readonly time: string; readonly partySize: number },
  bookings: readonly Booking[],
  ctx: AvailabilityContext,
  limit = 3,
): { readonly date: string; readonly time: string }[] {
  const wanted = toMinutes(query.time);
  const sameDay = slotsFor(query, bookings, ctx)
    .filter(isBookable)
    .sort((a, b) => Math.abs(toMinutes(a.time) - wanted) - Math.abs(toMinutes(b.time) - wanted))
    .map((slot) => ({ date: query.date, time: slot.time }));
  const later = bookableDates(ctx.now, ctx.timeZone, ctx.settings)
    .filter((date) => date > query.date)
    .flatMap((date) =>
      slotsFor({ ...query, date }, bookings, ctx)
        .filter(isBookable)
        .sort((a, b) => Math.abs(toMinutes(a.time) - wanted) - Math.abs(toMinutes(b.time) - wanted))
        .slice(0, 1)
        .map((slot) => ({ date, time: slot.time })),
    );
  return [...sameDay, ...later].slice(0, limit);
}
