import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { PlaceholderFrame } from "@/components/ui/PlaceholderFrame";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import type { EventInfo } from "@/domain/events/types";
import { whenShort } from "@/components/booking/format";
import { StockBadge } from "./StockBadge";

const t = copy.events;

export function EventCard({ event, outletName }: { readonly event: EventInfo; readonly outletName: string }) {
  return (
    <article className="group relative flex flex-col gap-3">
      <div className="relative">
        <PlaceholderFrame label={t.poster(event.title)} className="aspect-[16/10]" />
        <StockBadge slug={event.slug} className="absolute top-3 right-3" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="outline">{t.kinds[event.kind]}</Chip>
        <Chip tone="outline" className="text-fg-muted">
          {t.sample}
        </Chip>
      </div>
      <h2 className="text-h3 font-semibold">
        <Link href={routes.event(event.slug)} className="after:absolute after:inset-0 hover-fine:text-accent">
          {event.title}
        </Link>
      </h2>
      <p className="text-fg-muted">
        {whenShort(event.date, event.time)}, {outletName}
      </p>
    </article>
  );
}
