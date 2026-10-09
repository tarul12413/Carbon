import type { Booking } from "./schema";

/** A hold is live until its expiry instant; at that instant it is gone. */
export function holdMsLeft(booking: Pick<Booking, "status" | "holdExpiresAt">, now: Date): number {
  if (booking.status !== "held") return 0;
  return Math.max(0, Date.parse(booking.holdExpiresAt) - now.getTime());
}

export function isHoldLive(booking: Pick<Booking, "status" | "holdExpiresAt">, now: Date): boolean {
  return holdMsLeft(booking, now) > 0;
}

/** 582_000 → "09:42". Rounds up so the display never shows 00:00 while the hold is still live. */
export function formatCountdown(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
