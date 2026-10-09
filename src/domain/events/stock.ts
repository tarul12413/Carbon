import { HOLDS_SEATS } from "@/domain/orders/machine";
import type { Order, WaitlistEntry } from "@/domain/orders/schema";
import type { TicketType } from "./types";

/**
 * Seats left for a ticket type: quota minus sample sales, minus orders that hold seats (live holds,
 * pending payments, pay-at-cafe reservations and paid orders), minus seats offered to the waitlist.
 * Blueprint section 9: the check and the take happen in one step, never read-then-write.
 */
export function seatsLeft(
  type: TicketType,
  eventSlug: string,
  orders: readonly Order[],
  waitlist: readonly WaitlistEntry[],
  now: Date,
): number {
  const ordered = orders
    .filter((o) => o.kind === "tickets" && o.eventSlug === eventSlug && o.ticketTypeId === type.id)
    .filter((o) => HOLDS_SEATS.includes(o.status))
    .filter((o) => o.status !== "held" || Date.parse(o.holdExpiresAt) > now.getTime())
    .reduce((sum, o) => sum + o.quantity, 0);
  const offered = waitlist
    .filter((w) => w.eventSlug === eventSlug && w.ticketTypeId === type.id && w.status === "offered")
    .filter((w) => w.offerExpiresAt !== undefined && Date.parse(w.offerExpiresAt) > now.getTime())
    .reduce((sum, w) => sum + w.quantity, 0);
  return Math.max(0, type.quota - type.seedSold - ordered - offered);
}

export type StockState = "on_sale" | "few_left" | "sold_out";

/** "Few left" at a fifth of the quota or less (a display rule, not a Carbon policy). */
export function stockState(left: number, quota: number): StockState {
  if (left <= 0) return "sold_out";
  return left <= Math.ceil(quota / 5) ? "few_left" : "on_sale";
}
