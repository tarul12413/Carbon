import type { Booking } from "./schema";

/** RFC 5545 calendar file for a confirmed booking. Times are written in UTC. */

const stamp = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (text: string) =>
  text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export function bookingIcs(
  booking: Pick<Booking, "code" | "startsAt" | "partySize">,
  where: { readonly outletName: string; readonly address: string; readonly dwellMinutes: number; readonly now: Date },
): string {
  const ends = new Date(Date.parse(booking.startsAt) + where.dwellMinutes * 60_000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Carbon Jaipur//Booking demo//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${booking.code}@carbon-demo`,
    `DTSTAMP:${stamp(where.now.toISOString())}`,
    `DTSTART:${stamp(booking.startsAt)}`,
    `DTEND:${stamp(ends)}`,
    `SUMMARY:${escape(`Carbon ${where.outletName}, table for ${booking.partySize}`)}`,
    `LOCATION:${escape(where.address)}`,
    `DESCRIPTION:${escape(`Booking ${booking.code}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
