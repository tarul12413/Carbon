import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";

const t = copy.story;
const proof = copy.home.proof;

export const metadata: Metadata = { title: t.title };

/** Facts from Carbon's March 2026 menu PDF (pages 10, 16, 21) and the brief. Press: titles only, no article text. */
export default function StoryPage() {
  return (
    <main id="content" className="flex flex-col">
      <header className="content-cap flex flex-col gap-6 py-16 laptop:py-28">
        <p className="label-caps text-small text-fg-muted">{t.eyebrow}</p>
        <h1 className="max-w-4xl text-display font-semibold text-balance">{t.heading}</h1>
        <p className="max-w-prose text-h3 font-normal text-fg-muted">{t.intro}</p>
      </header>

      <section aria-labelledby="timeline-title" className="grid-motif border-y border-line">
        <div className="content-cap flex flex-col gap-8 py-16">
          <h2 id="timeline-title" className="label-caps self-start bg-surface p-1 text-small text-fg-muted">
            {t.timelineLabel}
          </h2>
          <ol className="flex flex-col border-l border-line-strong bg-surface">
            {t.timeline.map((entry) => (
              <li
                key={`${entry.when}-${entry.what}`}
                className="relative flex flex-col gap-1 py-4 pl-6 laptop:flex-row laptop:gap-8"
              >
                <span className="absolute top-6 -left-1.5 size-3 rounded-full bg-accent" aria-hidden="true" />
                <span className="w-40 shrink-0 font-mono text-accent">{entry.when}</span>
                <span className="text-h3 font-medium">{entry.what}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="awards-title" className="content-cap flex flex-col gap-8 py-16">
        <SectionHeading id="awards-title" eyebrow={proof.awardsLabel}>
          {proof.title}
        </SectionHeading>
        <ul className="grid gap-4 tablet:grid-cols-3">
          {proof.awards.map((award) => (
            <li key={award.org} className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-6">
              <span className="text-h3 font-semibold">{award.title}</span>
              <span className="text-fg-muted">{award.org}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="press-title" className="border-t border-line">
        <div className="content-cap flex flex-col gap-8 py-16">
          <h2 id="press-title" className="label-caps text-small text-fg-muted">
            {t.pressLabel}
          </h2>
          <ul className="divide-y divide-line border-y border-line">
            {t.press.map((item) => (
              <li
                key={item.publication}
                className="grid gap-2 py-6 laptop:grid-cols-[12rem_1fr_auto] laptop:items-baseline laptop:gap-8"
              >
                <span className="label-caps text-small">{item.publication}</span>
                <span className="text-h3 font-medium text-balance">{item.headline}</span>
                <span className="flex flex-col gap-1 laptop:items-end">
                  <span className="font-mono text-small text-fg-muted">{item.date}</span>
                  <span className="text-small text-fg-muted">
                    <Tbc id={placeholders.pressLinks.id}>{t.pressLink}</Tbc>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <ButtonLink href={routes.outlets} className="self-start">
            {t.cta}
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
