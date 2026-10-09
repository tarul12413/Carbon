import type { BookingStatus } from "./schema";

/** Blueprint section 9, booking state machine. Anything not listed here is refused. */
export type BookingEvent = "confirm" | "request" | "expire" | "approve" | "decline" | "cancel" | "complete" | "no_show";

const transitions: Readonly<Record<BookingStatus, Partial<Record<BookingEvent, BookingStatus>>>> = {
  held: { confirm: "confirmed", request: "requested", expire: "expired" },
  requested: { approve: "confirmed", decline: "declined", expire: "expired" },
  confirmed: { cancel: "cancelled", complete: "completed", no_show: "no_show" },
  expired: {},
  declined: {},
  cancelled: {},
  completed: {},
  no_show: {},
};

/** The status after `event`, or null if the machine does not allow it. */
export function nextStatus(status: BookingStatus, event: BookingEvent): BookingStatus | null {
  return transitions[status][event] ?? null;
}

export function isFinal(status: BookingStatus): boolean {
  return Object.keys(transitions[status]).length === 0;
}

export function eventsFrom(status: BookingStatus): readonly BookingEvent[] {
  return Object.keys(transitions[status]) as BookingEvent[];
}
