import type { WaitlistEntry } from "@/domain/orders/schema";

/** First in line, first served (Blueprint section 9). */
const inLine = (entries: readonly WaitlistEntry[], eventSlug: string, ticketTypeId: string) =>
  entries
    .filter((w) => w.eventSlug === eventSlug && w.ticketTypeId === ticketTypeId)
    .filter((w) => w.status === "waiting" || w.status === "offered")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

/** 1-based place in line, or null once the entry has been offered, claimed or has lapsed. */
export function positionInLine(entries: readonly WaitlistEntry[], entry: WaitlistEntry): number | null {
  if (entry.status !== "waiting" && entry.status !== "offered") return null;
  return inLine(entries, entry.eventSlug, entry.ticketTypeId).findIndex((w) => w.id === entry.id) + 1;
}

/** Who gets the next offer: the first waiting person whose party fits in the seats that opened. */
export function nextToOffer(
  entries: readonly WaitlistEntry[],
  eventSlug: string,
  ticketTypeId: string,
  seatsOpen: number,
): WaitlistEntry | undefined {
  const line = inLine(entries, eventSlug, ticketTypeId);
  const first = line.find((w) => w.status === "waiting");
  return first && first.quantity <= seatsOpen ? first : undefined;
}
