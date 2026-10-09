import type { Metadata } from "next";
import { CancelTicket } from "@/components/tickets/CancelTicket";
import { copy } from "@/content/copy";
import { ticketEvents } from "../../props";

export const metadata: Metadata = { title: copy.cancel.title };

interface PageProps {
  readonly params: Promise<{ code: string }>;
}

export default async function CancelTicketPage({ params }: PageProps) {
  const [{ code }, events] = await Promise.all([params, ticketEvents()]);
  return (
    <main id="content" className="content-cap flex max-w-xl flex-col py-8 laptop:py-14">
      <CancelTicket code={code} events={events} />
    </main>
  );
}
