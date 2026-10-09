import { services } from "@/services";
import type { TicketEvent } from "@/components/tickets/TicketView";

/** Event names, places and lengths for the ticket pages. */
export async function ticketEvents(): Promise<TicketEvent[]> {
  const [events, outlets] = await Promise.all([services.events.listUpcoming(), services.outlets.listOutlets()]);
  return events.map((e) => {
    const outlet = outlets.find((o) => o.slug === e.outlet);
    return {
      slug: e.slug,
      title: e.title,
      outletName: outlet?.name ?? e.outlet,
      address: outlet && !outlet.addressTbc ? outlet.address : "",
      durationMinutes: Math.round((Date.parse(e.endsAt) - Date.parse(e.startsAt)) / 60_000),
    };
  });
}
