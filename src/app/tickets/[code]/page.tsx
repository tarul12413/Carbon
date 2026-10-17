import type { Metadata } from "next";
import { TicketView } from "@/components/tickets/TicketView";
import { copy } from "@/content/copy";
import { ticketEvents } from "../props";

interface PageProps {
  readonly params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: copy.ticket.title((await params).code) };
}

/** Tickets live in the visitor's browser in the hosted demo (D-026), so the page loads them on the client. */
export default async function TicketPage({ params }: PageProps) {
  const [{ code }, events] = await Promise.all([params, ticketEvents()]);
  return (
    <main id="content" className="content-cap fold-left flex max-w-xl flex-col py-8 laptop:py-14">
      <TicketView code={code} events={events} />
    </main>
  );
}
