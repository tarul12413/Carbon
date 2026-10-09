import type { Booking } from "./schema";
import type { BookingSettings } from "./settings";

/**
 * Blueprint section 9: same phone and same slot within five minutes returns the existing booking.
 * The party size must match too: a different party is a different booking, not a repeat.
 */
export const DUPLICATE_WINDOW_MS = 5 * 60_000;

export type BookingKind = Booking["kind"];

/** Small groups confirm instantly; larger groups send a request (P-01). */
export function bookingKind(partySize: number, settings: BookingSettings): BookingKind {
  return partySize <= settings.instantMaxPartySize ? "instant" : "request";
}

export function findDuplicate(
  bookings: readonly Booking[],
  attempt: {
    readonly phone: string;
    readonly outlet: string;
    readonly date: string;
    readonly time: string;
    readonly partySize: number;
  },
  now: Date,
): Booking | undefined {
  return bookings.find(
    (b) =>
      b.phone === attempt.phone &&
      b.outlet === attempt.outlet &&
      b.date === attempt.date &&
      b.time === attempt.time &&
      b.partySize === attempt.partySize &&
      (b.status === "held" || b.status === "requested" || b.status === "confirmed") &&
      now.getTime() - Date.parse(b.createdAt) <= DUPLICATE_WINDOW_MS,
  );
}

/** Customers can change or cancel a confirmed booking until the cutoff before it starts (P-05). */
export function canChangeOrCancel(booking: Booking, now: Date, settings: BookingSettings): boolean {
  return (
    booking.status === "confirmed" &&
    Date.parse(booking.startsAt) - now.getTime() >= settings.changeCutoffMinutes * 60_000
  );
}
