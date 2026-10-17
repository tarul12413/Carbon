import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

const t = copy.home.bookWall;

/** Decorative spines: heights and tones from a fixed sequence, no titles or cover images. */
const SPINES = [
  [82, 0.9],
  [64, 0.55],
  [92, 0.75],
  [70, 0.4],
  [88, 0.65],
  [58, 0.85],
  [76, 0.5],
  [95, 0.7],
  [66, 0.45],
  [84, 0.8],
  [72, 0.6],
] as const;

export function BookWallTeaser() {
  return (
    <section aria-labelledby="wall-title" className="border-t border-line">
      <div className="content-cap grid fold-segments gap-10 py-16 laptop:grid-cols-2 laptop:items-end laptop:py-24">
        <div className="flex flex-col gap-6">
          <SectionHeading id="wall-title" eyebrow={t.eyebrow}>
            {t.title}
          </SectionHeading>
          <p className="max-w-prose text-fg-muted">{t.body}</p>
          <ButtonLink href={routes.bookWall} variant="secondary" className="self-start">
            {t.cta}
          </ButtonLink>
        </div>
        <div className="flex h-40 items-end gap-1.5 border-b-2 border-line-strong px-2" aria-hidden="true">
          {SPINES.map(([height, tone], i) => (
            <span
              key={i}
              className="max-w-10 flex-1 rounded-t-sm bg-accent"
              style={{ height: `${height}%`, opacity: tone, transform: `rotate(${(i % 3) - 1}deg)` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
