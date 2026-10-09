import type { OutletSlug } from "@/domain/outlet";

export const EVENT_KINDS = ["rave", "workshop", "collab"] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export interface TicketType {
  readonly id: string;
  readonly name: string;
  /** Unknown until Carbon sets it (P-03): shown as a label, never computed. */
  readonly pricePaise: number | null;
  readonly quota: number;
  /** Seats sold before this demo started (sample data). */
  readonly seedSold: number;
}

export interface EventInfo {
  readonly slug: string;
  readonly title: string;
  readonly kind: EventKind;
  readonly outlet: OutletSlug;
  /** Local date and time in Jaipur. */
  readonly date: string;
  readonly time: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly summary?: string;
  readonly ticketTypes: readonly TicketType[];
  /** Fictional people already waiting (sample data). */
  readonly seedWaitlist: number;
  /** Every event in Phase 1 is a labelled sample (Q-07). */
  readonly sample: true;
}

export interface PastEvent {
  readonly title: string;
  readonly kind: EventKind;
  readonly date: string;
}
