import { SectionHeading } from "@/components/ui/SectionHeading";
import { copy } from "@/content/copy";

const t = copy.home.proof;

/** Award and press titles only, as the brief requires. Press links come later; no article text is copied. */
export function Proof() {
  return (
    <section aria-labelledby="proof-title" className="border-t border-line">
      <div className="content-cap flex flex-col gap-10 py-16 laptop:py-24">
        <SectionHeading id="proof-title" eyebrow={t.eyebrow}>
          {t.title}
        </SectionHeading>
        <div className="grid gap-10 laptop:grid-cols-[2fr_1fr]">
          <section aria-labelledby="awards-title" className="flex flex-col gap-4">
            <h3 id="awards-title" className="label-caps text-small text-fg-muted">
              {t.awardsLabel}
            </h3>
            <ul className="divide-y divide-line border-y border-line">
              {t.awards.map((award) => (
                <li
                  key={award.org}
                  className="flex flex-col gap-1 py-5 tablet:flex-row tablet:justify-between tablet:gap-6"
                >
                  <span className="text-h3 font-semibold">{award.title}</span>
                  <span className="text-fg-muted tablet:text-right">{award.org}</span>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="press-title" className="flex flex-col gap-4">
            <h3 id="press-title" className="label-caps text-small text-fg-muted">
              {t.pressLabel}
            </h3>
            <ul className="flex flex-col gap-3">
              {t.press.map((title) => (
                <li key={title} className="text-h3 font-medium">
                  {title}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
