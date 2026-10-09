import { describe, expect, it } from "vitest";
import {
  alternativeSlots,
  bookableDates,
  seatsTaken,
  slotsFor,
  slotTimes,
  takesSeats,
} from "@/domain/booking/availability";
import { newBookingCode, normalizeBookingCode } from "@/domain/booking/code";
import { formatCountdown, holdMsLeft, isHoldLive } from "@/domain/booking/hold";
import { bookingIcs } from "@/domain/booking/ics";
import { eventsFrom, isFinal, nextStatus } from "@/domain/booking/machine";
import { formatIndianMobile, maskIndianMobile, normalizeIndianMobile } from "@/domain/booking/phone";
import { bookingKind, canChangeOrCancel, findDuplicate } from "@/domain/booking/rules";
import { BOOKING_STATUSES, type Booking } from "@/domain/booking/schema";
import { bookingSettingsFor, type BookingSettings } from "@/domain/booking/settings";
import { addDays, localDate, zonedInstant } from "@/domain/time";

const IST = "Asia/Kolkata";
const jaipur = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00+05:30`);
const settings: BookingSettings = {
  slotMinutes: 30,
  dwellMinutes: 90,
  capacityPerSlot: 24,
  instantMaxPartySize: 6,
  maxPartySize: 20,
  minLeadMinutes: 60,
  maxDaysAhead: 30,
  holdMinutes: 10,
  changeCutoffMinutes: 120,
};
const hours = { open: "09:00", close: "23:45" };
const NOW = jaipur("2026-10-10", "12:00");

const booking = (over: Partial<Booking>): Booking => ({
  code: "CRB-1000",
  outlet: "c-scheme",
  date: "2026-10-11",
  time: "19:00",
  startsAt: jaipur("2026-10-11", "19:00").toISOString(),
  partySize: 2,
  kind: "instant",
  status: "confirmed",
  name: "Sample guest",
  phone: "+919000000001",
  note: "",
  whatsappOptIn: false,
  consent: { noticeVersion: "draft-0", at: NOW.toISOString() },
  holdExpiresAt: NOW.toISOString(),
  source: "web",
  createdAt: NOW.toISOString(),
  history: [],
  ...over,
});

describe("time zone helpers", () => {
  it("turns a Jaipur wall-clock time into the right instant", () => {
    expect(zonedInstant("2026-10-11", 19 * 60, IST).toISOString()).toBe("2026-10-11T13:30:00.000Z");
    expect(zonedInstant("2026-10-11", 30, IST).toISOString()).toBe("2026-10-10T19:00:00.000Z");
  });

  it("reads today's date in Jaipur, not on the machine", () => {
    expect(localDate(new Date("2026-10-10T19:00:00Z"), IST)).toBe("2026-10-11");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });
});

describe("phone numbers (+91)", () => {
  it.each(["9876543210", "98765 43210", "+91 98765-43210", "+919876543210", "09876543210", "919876543210"])(
    "accepts %s",
    (input) => expect(normalizeIndianMobile(input)).toBe("+919876543210"),
  );

  it.each(["", "12345", "5876543210", "+44 7700 900123", "98765432100"])("refuses %s", (input) =>
    expect(normalizeIndianMobile(input)).toBeNull(),
  );

  it("formats and masks", () => {
    expect(formatIndianMobile("+919876543210")).toBe("+91 98765 43210");
    expect(maskIndianMobile("+919876543210")).toBe("+91 ••••• •3210");
  });
});

describe("booking state machine", () => {
  it("follows the blueprint's transitions", () => {
    expect(nextStatus("held", "confirm")).toBe("confirmed");
    expect(nextStatus("held", "request")).toBe("requested");
    expect(nextStatus("held", "expire")).toBe("expired");
    expect(nextStatus("requested", "approve")).toBe("confirmed");
    expect(nextStatus("requested", "decline")).toBe("declined");
    expect(nextStatus("requested", "expire")).toBe("expired");
    expect(nextStatus("confirmed", "cancel")).toBe("cancelled");
    expect(nextStatus("confirmed", "complete")).toBe("completed");
    expect(nextStatus("confirmed", "no_show")).toBe("no_show");
  });

  it("refuses everything else", () => {
    expect(nextStatus("held", "cancel")).toBeNull();
    expect(nextStatus("requested", "confirm")).toBeNull();
    expect(nextStatus("confirmed", "expire")).toBeNull();
    expect(nextStatus("expired", "confirm")).toBeNull();
    expect(nextStatus("cancelled", "approve")).toBeNull();
  });

  it("has five final states", () => {
    expect(BOOKING_STATUSES.filter(isFinal)).toEqual(["expired", "declined", "cancelled", "completed", "no_show"]);
    expect(eventsFrom("held")).toEqual(["confirm", "request", "expire"]);
  });
});

describe("instant versus request", () => {
  it("confirms up to the threshold instantly and asks above it", () => {
    expect(bookingKind(1, settings)).toBe("instant");
    expect(bookingKind(6, settings)).toBe("instant");
    expect(bookingKind(7, settings)).toBe("request");
  });

  it("uses the placeholder threshold for every outlet", () => {
    expect(bookingSettingsFor("raja-park").instantMaxPartySize).toBe(6);
  });
});

describe("availability", () => {
  it("offers slots whose whole dwell fits before closing", () => {
    const times = slotTimes(hours, settings);
    expect(times[0]).toBe("09:00");
    expect(times.at(-1)).toBe("22:00");
    expect(times).toHaveLength(27);
  });

  it("counts confirmed bookings and live instant holds across the dwell time", () => {
    const bookings = [
      booking({ time: "19:00", partySize: 4 }),
      booking({ code: "CRB-1001", time: "20:00", partySize: 3 }),
      booking({ code: "CRB-1002", time: "20:30", partySize: 5 }),
    ];
    const at = (time: string) => seatsTaken(bookings, { outlet: "c-scheme", date: "2026-10-11", time }, settings, NOW);
    expect(at("17:30")).toBe(0);
    expect(at("18:00")).toBe(4);
    expect(at("19:00")).toBe(7);
    expect(at("19:30")).toBe(12);
    expect(at("20:00")).toBe(12);
    expect(at("21:30")).toBe(5);
  });

  it("ignores requests, expired holds, other outlets and other days", () => {
    const now = NOW;
    expect(takesSeats(booking({ status: "requested", kind: "request" }), now)).toBe(false);
    expect(takesSeats(booking({ status: "held", holdExpiresAt: now.toISOString() }), now)).toBe(false);
    expect(takesSeats(booking({ status: "held", holdExpiresAt: new Date(now.getTime() + 1).toISOString() }), now)).toBe(
      true,
    );
    expect(takesSeats(booking({ status: "held", kind: "request", holdExpiresAt: "2030-01-01T00:00:00Z" }), now)).toBe(
      false,
    );
    const elsewhere = [booking({ outlet: "raja-park" }), booking({ date: "2026-10-12" })];
    expect(seatsTaken(elsewhere, { outlet: "c-scheme", date: "2026-10-11", time: "19:00" }, settings, now)).toBe(0);
  });

  it("marks slots past, full or low", () => {
    const full = [
      booking({ partySize: 6 }),
      booking({ partySize: 6 }),
      booking({ partySize: 6 }),
      booking({ partySize: 4 }),
    ];
    const today = slotsFor({ outlet: "c-scheme", date: "2026-10-10", partySize: 2 }, [], {
      hours,
      settings,
      now: NOW,
      timeZone: IST,
    });
    expect(today.find((s) => s.time === "12:30")?.state).toBe("past");
    expect(today.find((s) => s.time === "13:00")?.state).toBe("open");

    const tomorrow = (partySize: number) =>
      slotsFor({ outlet: "c-scheme", date: "2026-10-11", partySize }, full, {
        hours,
        settings,
        now: NOW,
        timeZone: IST,
      });
    expect(tomorrow(2).find((s) => s.time === "19:00")).toEqual({ time: "19:00", remaining: 2, state: "low" });
    expect(tomorrow(3).find((s) => s.time === "19:00")?.state).toBe("full");
    expect(tomorrow(2).find((s) => s.time === "16:00")?.state).toBe("open");
    expect(tomorrow(12).find((s) => s.time === "19:00")?.state).toBe("open");
  });

  it("books from today through the window", () => {
    const dates = bookableDates(NOW, IST, settings);
    expect(dates[0]).toBe("2026-10-10");
    expect(dates).toHaveLength(31);
  });

  it("suggests the nearest free times, then other days", () => {
    const full = Array.from({ length: 4 }, (_, i) => booking({ code: `CRB-20${i}0`, partySize: 6 }));
    const suggestions = alternativeSlots(
      { outlet: "c-scheme", date: "2026-10-11", time: "19:00", partySize: 2 },
      full,
      { hours, settings, now: NOW, timeZone: IST },
    );
    expect(suggestions).toEqual([
      { date: "2026-10-11", time: "17:30" },
      { date: "2026-10-11", time: "20:30" },
      { date: "2026-10-11", time: "17:00" },
    ]);
  });
});

describe("holds", () => {
  const held = { status: "held" as const, holdExpiresAt: new Date(NOW.getTime() + 10 * 60_000).toISOString() };

  it("counts down and expires at the instant", () => {
    expect(holdMsLeft(held, NOW)).toBe(600_000);
    expect(isHoldLive(held, new Date(NOW.getTime() + 599_999))).toBe(true);
    expect(isHoldLive(held, new Date(NOW.getTime() + 600_000))).toBe(false);
    expect(holdMsLeft({ ...held, status: "confirmed" }, NOW)).toBe(0);
  });

  it("formats the countdown and never shows zero while live", () => {
    expect(formatCountdown(600_000)).toBe("10:00");
    expect(formatCountdown(582_000)).toBe("09:42");
    expect(formatCountdown(1)).toBe("00:01");
    expect(formatCountdown(-5)).toBe("00:00");
  });
});

describe("duplicates and changes", () => {
  it("returns the existing booking for the same phone and slot within five minutes", () => {
    const existing = booking({ status: "held" });
    const attempt = {
      phone: existing.phone,
      outlet: "c-scheme",
      date: existing.date,
      time: existing.time,
      partySize: 2,
    };
    expect(findDuplicate([existing], attempt, new Date(NOW.getTime() + 5 * 60_000))).toBe(existing);
    expect(findDuplicate([existing], attempt, new Date(NOW.getTime() + 5 * 60_000 + 1))).toBeUndefined();
    expect(findDuplicate([existing], { ...attempt, time: "19:30" }, NOW)).toBeUndefined();
    expect(findDuplicate([existing], { ...attempt, partySize: 3 }, NOW)).toBeUndefined();
    expect(findDuplicate([booking({ status: "expired" })], attempt, NOW)).toBeUndefined();
  });

  it("allows change or cancel only before the cutoff", () => {
    const starts = jaipur("2026-10-11", "19:00").getTime();
    expect(canChangeOrCancel(booking({}), new Date(starts - 120 * 60_000), settings)).toBe(true);
    expect(canChangeOrCancel(booking({}), new Date(starts - 119 * 60_000), settings)).toBe(false);
    expect(canChangeOrCancel(booking({ status: "requested" }), NOW, settings)).toBe(false);
  });
});

describe("codes and calendar", () => {
  it("makes CRB codes and skips taken ones", () => {
    const rolls = [0.5, 0.5, 0.1];
    expect(newBookingCode(new Set(["CRB-5500"]), () => rolls.shift() ?? 0)).toBe("CRB-1900");
    expect(normalizeBookingCode(" crb4821 ")).toBe("CRB-4821");
  });

  it("writes a calendar event in UTC", () => {
    const ics = bookingIcs(booking({}), {
      outletName: "C Scheme",
      address: "F-6A, Amir Manzil; Jaipur",
      dwellMinutes: 90,
      now: NOW,
    });
    expect(ics).toContain("DTSTART:20261011T133000Z\r\n");
    expect(ics).toContain("DTEND:20261011T150000Z\r\n");
    expect(ics).toContain("LOCATION:F-6A\\, Amir Manzil\\; Jaipur\r\n");
  });
});
