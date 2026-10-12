import type { Metadata } from "next";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { StaffScanner } from "@/components/stamps/StaffScanner";
import { copy } from "@/content/copy";
import { flags } from "@/config/flags";
import { services } from "@/services";
import { ticketEvents } from "../tickets/props";

export const metadata: Metadata = { title: copy.staff.title };

/**
 * The staff scanner (Blueprint 5.7): the event door always, the stamp card with its flag on.
 * Mock sign-in and a simulated camera; Phase 2 is a PWA behind staff sign-in on registered devices.
 */
export default async function StaffPage() {
  const [outlets, events] = await Promise.all([services.outlets.listOutlets(), ticketEvents()]);
  return (
    <main id="content" className="flex flex-1 flex-col">
      <div className="content-cap flex max-w-xl flex-col py-8 laptop:py-14">
        <StaffScanner
          outlets={outlets.map((o) => ({ slug: o.slug, name: o.name }))}
          events={events}
          stampCard={flags.stampCard}
          devPanel={flags.devPanel}
        />
      </div>
      {flags.devPanel && <DemoPanel />}
    </main>
  );
}
