import type { EventInfo, PastEvent } from "@/domain/events/types";

/** Events and workshops (Blueprint section 9: events, ticket_types). Stock lives in TicketingService. */
export interface EventCatalogue {
  /** Upcoming events, soonest first. */
  listUpcoming(): Promise<readonly EventInfo[]>;
  getEvent(slug: string): Promise<EventInfo | null>;
  listPast(): Promise<readonly PastEvent[]>;
}

export type { EventInfo, PastEvent };
