import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PlaceholderFrame } from "@/components/ui/PlaceholderFrame";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { outlets, type OutletSlug } from "@/config/site";

const t = copy.home.outlets;

const addressPlaceholder: Partial<Record<OutletSlug, string>> = {
  "raja-park": placeholders.rajaParkBuildingNumber.id,
  "vaishali-nagar": placeholders.vaishaliNagarAddress.id,
};

export function OutletsSection() {
  return (
    <section aria-labelledby="outlets-title" className="border-t border-line">
      <div className="content-cap flex flex-col gap-10 py-16 laptop:py-24">
        <SectionHeading id="outlets-title" eyebrow={t.eyebrow}>
          {t.title}
        </SectionHeading>
        <ul className="grid gap-6 tablet:grid-cols-2 laptop:grid-cols-3">
          {outlets.map((outlet) => {
            const tbcId = addressPlaceholder[outlet.slug];
            return (
              <li key={outlet.slug} className="flex flex-col gap-4">
                <PlaceholderFrame label={t.photo(outlet.name)} className="aspect-[4/3]" />
                <h3 className="text-h3 font-semibold">{outlet.name}</h3>
                <p className="flex gap-2 text-fg-muted">
                  <Icon name="pin" className="mt-1" />
                  {tbcId ? <Tbc id={tbcId}>{outlet.address}</Tbc> : outlet.address}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2">
                  <ButtonLink href={routes.bookAt(outlet.slug)} variant="secondary">
                    {t.book}
                    <span className="sr-only">: {outlet.name}</span>
                  </ButtonLink>
                  <Link href={routes.outlet(outlet.slug)} className="inline-flex min-h-11 items-center text-accent">
                    {t.details}
                    <span className="sr-only">: {outlet.name}</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
