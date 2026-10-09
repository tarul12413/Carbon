import { describe, expect, it } from "vitest";
import { formatClock, getOutletStatus, minutesIntoDay } from "@/domain/hours";

const IST = "Asia/Kolkata";
/** A wall-clock time in Jaipur, expressed as a UTC instant (IST is UTC+5:30, no DST). */
const jaipur = (hhmm: string) => new Date(`2026-10-10T${hhmm}:00+05:30`);
const placeholderHours = { open: "09:00", close: "23:45" };

describe("outlet hours", () => {
  it("reads the local time in the outlet's zone, not the machine's", () => {
    expect(minutesIntoDay(jaipur("00:30"), IST)).toBe(30);
    expect(minutesIntoDay(new Date("2026-10-10T18:30:00Z"), IST)).toBe(0);
  });

  it("is closed before opening and says it opens today", () => {
    expect(getOutletStatus(placeholderHours, jaipur("08:59"), IST)).toEqual({
      state: "closed",
      opensAt: "09:00",
      opensDay: "today",
    });
  });

  it("is open from opening until just before closing", () => {
    expect(getOutletStatus(placeholderHours, jaipur("09:00"), IST)).toEqual({ state: "open", closesAt: "23:45" });
    expect(getOutletStatus(placeholderHours, jaipur("23:44"), IST).state).toBe("open");
  });

  it("is closed after closing and opens tomorrow", () => {
    expect(getOutletStatus(placeholderHours, jaipur("23:45"), IST)).toEqual({
      state: "closed",
      opensAt: "09:00",
      opensDay: "tomorrow",
    });
  });

  it("handles hours that run past midnight", () => {
    const late = { open: "09:00", close: "01:00" };
    expect(getOutletStatus(late, jaipur("00:30"), IST).state).toBe("open");
    expect(getOutletStatus(late, jaipur("01:00"), IST)).toEqual({
      state: "closed",
      opensAt: "09:00",
      opensDay: "today",
    });
    expect(getOutletStatus(late, jaipur("23:59"), IST).state).toBe("open");
  });

  it("formats times the way people say them", () => {
    expect(formatClock("09:00")).toBe("9 AM");
    expect(formatClock("23:45")).toBe("11:45 PM");
    expect(formatClock("12:00")).toBe("12 PM");
    expect(formatClock("00:15")).toBe("12:15 AM");
  });

  it("rejects malformed times", () => {
    expect(() => formatClock("9:00")).toThrow();
  });
});
