/**
 * Open-now status from daily hours, evaluated in the outlet's time zone.
 * Times are "HH:MM" 24-hour strings. A close time at or before the open time
 * means the outlet closes after midnight.
 */

export interface DailyHours {
  readonly open: string;
  readonly close: string;
}

export type OutletStatus =
  | { readonly state: "open"; readonly closesAt: string }
  | { readonly state: "closed"; readonly opensAt: string; readonly opensDay: "today" | "tomorrow" };

export const toMinutes = (hhmm: string): number => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!match) throw new Error(`Expected HH:MM, got ${hhmm}`);
  return Number(match[1]) * 60 + Number(match[2]);
};

export function minutesIntoDay(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  return hour * 60 + minute;
}

export function getOutletStatus(hours: DailyHours, now: Date, timeZone: string): OutletStatus {
  const open = toMinutes(hours.open);
  const close = toMinutes(hours.close);
  const current = minutesIntoDay(now, timeZone);
  const overnight = close <= open;
  const isOpen = overnight ? current >= open || current < close : current >= open && current < close;

  if (isOpen) return { state: "open", closesAt: hours.close };
  return { state: "closed", opensAt: hours.open, opensDay: current < open ? "today" : "tomorrow" };
}

/** "23:45" → "11:45 PM", "09:00" → "9 AM". */
export function formatClock(hhmm: string): string {
  const minutes = toMinutes(hhmm);
  const h24 = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
