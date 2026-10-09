/**
 * Calendar helpers for a fixed time zone. A "local date" is "YYYY-MM-DD" as seen in that zone,
 * and a slot time is "HH:MM". Instants are stored as UTC ISO strings (Blueprint section 9).
 */

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDate = (date: string): [number, number, number] => {
  const match = DATE.exec(date);
  if (!match) throw new Error(`Expected YYYY-MM-DD, got ${date}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
};

export function isLocalDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [y, m, d] = parseDate(value);
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

/** The calendar date at `now` in `timeZone`. */
export function localDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = parseDate(date);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Offset of `timeZone` from UTC at `instant`, in minutes (Asia/Kolkata: 330). */
function offsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - Math.floor(instant.getTime() / 60_000) * 60_000) / 60_000);
}

/** The instant when the wall clock in `timeZone` reads `date` at `minutes` past midnight. */
export function zonedInstant(date: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = parseDate(date);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const offset = offsetMinutes(new Date(guess), timeZone);
  return new Date(guess - offset * 60_000);
}

/** 1110 → "18:30". */
export function toHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "2026-10-16" → "Fri 16". Uses UTC so the label never shifts with the machine's zone. */
export function shortDay(date: string): string {
  const [y, m, d] = parseDate(date);
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
  return `${weekday} ${d}`;
}

/** "2026-10-16" → "Friday 16 October". */
export function longDay(date: string): string {
  const [y, m, d] = parseDate(date);
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}
