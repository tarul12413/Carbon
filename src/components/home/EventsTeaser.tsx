import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

const t = copy.home.events;

export function EventsTeaser() {
  return (
    <section aria-labelledby="events-title" className="grid-motif border-t border-line">
      <div className="content-cap flex flex-col gap-10 py-16 laptop:py-24">
        <SectionHeading id="events-title" eyebrow={t.eyebrow} className="bg-surface p-1 tablet:self-start">
          {t.title}
        </SectionHeading>
        <ul className="grid gap-4 tablet:grid-cols-3">
          {t.items.map((item) => (
            <li key={item.name} className="flex flex-col gap-2 rounded-md border border-line bg-surface p-6">
              <h3 className="text-h3 font-semibold">{item.name}</h3>
              <p className="text-fg-muted">{item.line}</p>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={routes.events}>{t.cta}</ButtonLink>
          <ButtonLink href={routes.enquire} variant="secondary" className="bg-surface">
            {t.host}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
