import type { Metadata } from "next";
import { SteepExplorer } from "@/components/coldbrew/SteepExplorer";
import { BrewCard } from "@/components/home/BrewCard";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import { services } from "@/services";

const t = copy.coldBrew;

export const metadata: Metadata = { title: t.title };

export default async function ColdBrewPage() {
  const coldBrews = await services.menu.listColdBrews();
  const brews = coldBrews.map(({ id, name, notes, steepHours }) => ({ id, name, notes, steepHours }));

  return (
    <main id="content" className="content-cap flex flex-col gap-16 py-12 laptop:gap-24 laptop:py-20">
      <header className="grid fold-segments gap-8 laptop:grid-cols-[1fr_1.2fr] laptop:items-end">
        <div className="flex flex-col gap-3">
          <p className="label-caps text-small text-fg-muted">{t.eyebrow}</p>
          <h1 className="font-mono text-h1 font-medium text-accent">{t.heading}</h1>
        </div>
        <figure className="flex flex-col gap-3 border-l-2 border-accent pl-5">
          <blockquote className="text-body text-pretty">{t.quote}</blockquote>
          <figcaption className="text-small text-fg-muted">{t.quoteSource}</figcaption>
        </figure>
      </header>

      <section aria-labelledby="explorer-title" className="flex flex-col gap-8">
        <SectionHeading id="explorer-title" eyebrow={t.explorer.eyebrow}>
          {t.explorer.title}
        </SectionHeading>
        <SteepExplorer brews={brews} />
      </section>

      <section aria-labelledby="seven-title" className="flex flex-col gap-8">
        <SectionHeading id="seven-title" eyebrow={t.seven.eyebrow}>
          {t.seven.title}
        </SectionHeading>
        <ul className="fold-grid gap-y-4 laptop:grid-cols-3 laptop:gap-x-4">
          {brews.map((brew) => (
            <li key={brew.id}>
              <BrewCard brew={brew} />
            </li>
          ))}
        </ul>
        <ButtonLink href={routes.menu} className="self-start">
          {t.cta}
        </ButtonLink>
      </section>
    </main>
  );
}
