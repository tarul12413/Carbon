import type { Metadata } from "next";
import Link from "next/link";
import { EventCard } from "@/components/events/EventCard";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import type { EventKind } from "@/domain/events/types";
import { fullDate } from "@/domain/time";
import { cx } from "@/lib/cx";
import { services } from "@/services";

const t = copy.events;

export const metadata: Metadata = { title: t.title };

const FILTERS = ["all", "workshop", "collab"] as const;
type Filter = (typeof FILTERS)[number];

interface PageProps {
  readonly searchParams: Promise<{ kind?: string }>;
}

/** Rendered per request: the sample events are dated from today (Q-07). */
export default async function EventsPage({ searchParams }: PageProps) {
  const kind = (await searchParams).kind;
  const filter: Filter = FILTERS.includes(kind as Filter) ? (kind as Filter) : "all";
  const [events, past, outlets] = await Promise.all([
    services.events.listUpcoming(),
    services.events.listPast(),
    services.outlets.listOutlets(),
  ]);
  const shown = filter === "all" ? events : events.filter((e) => e.kind === (filter as EventKind));
  const outletName = (slug: string) => outlets.find((o) => o.slug === slug)?.name ?? slug;

  return (
    <main id="content" className="content-cap flex flex-col gap-10 py-10 laptop:py-16">
      <header className="flex flex-col gap-4">
        <h1 className="text-display font-semibold">{t.heading}</h1>
        <p className="max-w-prose text-fg-muted">{t.intro}</p>
      </header>

      <nav aria-label={t.filtersLabel}>
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <li key={f}>
              <Link
                href={f === "all" ? routes.events : `${routes.events}?kind=${f}`}
                aria-current={f === filter ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-11 items-center rounded-full border px-4 font-medium",
                  f === filter ? "border-accent bg-accent text-on-accent" : "border-line-strong hover-fine:border-fg",
                )}
              >
                {t.filters[f]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {shown.length > 0 ? (
        <ul className="fold-grid gap-y-10 laptop:grid-cols-3">
          {shown.map((event) => (
            <li key={event.slug}>
              <EventCard event={event} outletName={outletName(event.outlet)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-md border border-line p-6">
          <p className="text-h3 font-semibold">{t.noneTitle}</p>
          <p className="text-fg-muted">{t.noneBody}</p>
          <ButtonLink href={routes.enquire} variant="secondary">
            {t.enquire}
          </ButtonLink>
        </div>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-title" className="flex flex-col gap-4 border-t border-line pt-8">
          <h2 id="past-title" className="label-caps text-small text-fg-muted">
            {t.pastLabel}
          </h2>
          <ul className="flex flex-col gap-2">
            {past.map((event) => (
              <li key={event.title} className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="w-40 font-mono text-small text-accent">{fullDate(event.date)}</span>
                <span className="text-h3 font-medium">{event.title}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
