import Link from "next/link";
import { OutletStatus } from "@/components/outlets/OutletStatus";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import { outlets, site } from "@/config/site";

const t = copy.home.today;

export function TodayAtCarbon() {
  return (
    <section aria-labelledby="today-title" className="border-t border-line">
      <div className="content-cap grid gap-10 py-16 laptop:grid-cols-[1fr_1.2fr] laptop:items-center laptop:py-24">
        <header className="flex flex-col gap-3">
          <p className="label-caps text-small text-fg-muted">{t.eyebrow}</p>
          <h2 id="today-title" className="text-h1 font-semibold">
            {t.lead} <span className="block text-accent">{t.accent}</span>
          </h2>
        </header>
        <div className="flex flex-col gap-6">
          <ul className="flex flex-col gap-3">
            {outlets.map((outlet) => (
              <li key={outlet.slug}>
                <Link
                  href={routes.outlet(outlet.slug)}
                  aria-label={t.outletLink(outlet.name)}
                  className="group flex min-h-11 items-center justify-between gap-4 rounded-md border border-line bg-surface-raised p-4 transition-colors laptop:p-5 hover-fine:border-line-strong"
                >
                  <span className="flex flex-col gap-1">
                    <span className="text-h3 font-semibold">{outlet.name}</span>
                    <OutletStatus hours={outlet.hours} timeZone={site.timeZone} />
                  </span>
                  <Icon name="arrowRight" className="text-accent transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 tablet:grid-cols-2">
            <ButtonLink href={routes.book}>{copy.home.hero.book}</ButtonLink>
            <ButtonLink href={routes.menu} variant="secondary">
              {copy.home.hero.menu}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
