import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { whenLong } from "@/components/booking/format";
import { TicketPicker } from "@/components/events/TicketPicker";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { PlaceholderFrame } from "@/components/ui/PlaceholderFrame";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { flags } from "@/config/flags";
import { routes } from "@/config/routes";
import { services } from "@/services";

const t = copy.events;

interface PageProps {
  readonly params: Promise<{ slug: string }>;
  readonly searchParams: Promise<{ claim?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const event = await services.events.getEvent((await params).slug);
  return { title: event?.title ?? t.title };
}

/** Rendered per request: the sample events are dated from today (Q-07). */
export default async function EventPage({ params, searchParams }: PageProps) {
  const [{ slug }, { claim }] = await Promise.all([params, searchParams]);
  const event = await services.events.getEvent(slug);
  if (!event) notFound();
  const outlet = await services.outlets.getOutlet(event.outlet);

  return (
    <main id="content" className="flex flex-col">
      <div className="content-cap fold-grid gap-y-8 py-8 tablet:items-start tablet:gap-x-12 laptop:py-14">
        <div className="flex flex-col gap-6">
          <Link
            href={routes.events}
            className="inline-flex min-h-11 items-center gap-2 self-start text-fg-muted hover-fine:text-fg"
          >
            <Icon name="arrowLeft" />
            {t.back}
          </Link>
          <PlaceholderFrame label={t.poster(event.title)} className="aspect-[16/10]" />
          <div className="flex flex-wrap gap-2">
            <Chip tone="outline">{t.kinds[event.kind]}</Chip>
            <Chip tone="outline" className="text-fg-muted">
              {t.sample}
            </Chip>
          </div>
          <h1 className="text-h1 font-semibold text-balance">{event.title}</h1>
          <p className="text-h3 font-normal text-fg-muted">
            {whenLong(event.date, event.time)}, {outlet?.name}
          </p>
          <p>{event.summary ?? <Tbc id="Q-07">{t.detailsTbc}</Tbc>}</p>
          <p className="text-small text-fg-muted">{t.sampleNote}</p>
        </div>
        <section aria-label={t.tickets.legend} className="min-h-80 tablet:sticky tablet:top-24">
          <TicketPicker slug={event.slug} {...(claim ? { claim } : {})} />
        </section>
      </div>
      {flags.devPanel && <DemoPanel eventSlug={event.slug} />}
    </main>
  );
}
