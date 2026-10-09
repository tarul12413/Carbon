import type { Booking } from "./schema";

/** RFC 5545 calendar files. Times are written in UTC. */

const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export interface CalendarEntry {
  readonly uid: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly summary: string;
  readonly location: string;
  readonly description: string;
  readonly now: Date;
}

export function calendarFile(entry: CalendarEntry): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Carbon Jaipur//Demo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${entry.uid}@carbon-demo`,
    `DTSTAMP:${stamp(entry.now.toISOString())}`,
    `DTSTART:${stamp(entry.startsAt)}`,
    `DTEND:${stamp(entry.endsAt)}`,
    `SUMMARY:${escape(entry.summary)}`,
    `LOCATION:${escape(entry.location)}`,
    `DESCRIPTION:${escape(entry.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function bookingIcs(
  booking: Pick<Booking, "code" | "startsAt" | "partySize">,
  where: { readonly outletName: string; readonly address: string; readonly dwellMinutes: number; readonly now: Date },
): string {
  return calendarFile({
    uid: booking.code,
    startsAt: booking.startsAt,
    endsAt: new Date(Date.parse(booking.startsAt) + where.dwellMinutes * 60_000).toISOString(),
    summary: `Carbon ${where.outletName}, table for ${booking.partySize}`,
    location: where.address,
    description: `Booking ${booking.code}`,
    now: where.now,
  });
}
