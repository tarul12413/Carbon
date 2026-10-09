import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OutletAddress } from "@/components/outlets/OutletAddress";
import { OutletStatus } from "@/components/outlets/OutletStatus";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PlaceholderFrame } from "@/components/ui/PlaceholderFrame";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { formatClock } from "@/domain/hours";
import type { Outlet } from "@/domain/outlet";
import { mapsHref } from "@/lib/maps";
import { services } from "@/services";

const t = copy.outlets;

export const dynamicParams = false;

export async function generateStaticParams() {
  const outlets = await services.outlets.listOutlets();
  return outlets.map((o) => ({ slug: o.slug }));
}

interface PageProps {
  readonly params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const outlet = await services.outlets.getOutlet((await params).slug);
  return { title: outlet ? `${outlet.name} outlet` : t.title };
}

/** Structured data with confirmed facts only: no unconfirmed address, no placeholder hours. */
function localBusiness(outlet: Outlet) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: `${site.name}, ${outlet.name}`,
    servesCuisine: "Coffee",
    ...(outlet.addressTbc
      ? {}
      : {
          address: {
            "@type": "PostalAddress",
            streetAddress: outlet.address,
            addressLocality: site.city,
            addressCountry: "IN",
          },
        }),
  };
}

export default async function OutletPage({ params }: PageProps) {
  const outlet = await services.outlets.getOutlet((await params).slug);
  if (!outlet) notFound();

  return (
    <main id="content" className="content-cap flex flex-col gap-10 py-10 laptop:py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness(outlet)).replace(/</g, "\\u003c") }}
      />
      <Link href={routes.outlets} className="inline-flex min-h-11 items-center gap-2 self-start text-fg-muted">
        <Icon name="arrowRight" className="size-4 rotate-180" />
        {t.all}
      </Link>
      <header className="flex flex-col gap-3">
        <p className="label-caps text-small text-fg-muted">{t.eyebrow}</p>
        <h1 className="text-h1 font-semibold">{outlet.name}</h1>
        <OutletStatus hours={outlet.hours} timeZone={site.timeZone} />
      </header>

      <div className="grid gap-10 laptop:grid-cols-[1.4fr_1fr]">
        <div className="grid grid-cols-2 gap-3">
          <PlaceholderFrame label={t.photo(outlet.name, 1)} className="col-span-2 aspect-[16/10]" />
          <PlaceholderFrame label={t.photo(outlet.name, 2)} className="aspect-square" />
          <PlaceholderFrame label={t.photo(outlet.name, 3)} className="aspect-square" />
        </div>

        <div className="flex flex-col gap-8">
          <p className="text-h3 text-fg-muted">
            <Tbc id={placeholders.outletVibeLine.id}>{t.vibe}</Tbc>
          </p>
          <section aria-labelledby="address-title" className="flex flex-col gap-2">
            <h2 id="address-title" className="label-caps text-small text-fg-muted">
              {t.address}
            </h2>
            <OutletAddress outlet={outlet} />
            {outlet.addressTbc ? (
              <p className="text-small text-fg-muted">{t.directionsPending}</p>
            ) : (
              <a
                href={mapsHref(outlet)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 self-start text-accent underline underline-offset-4"
              >
                {t.directions}
                <Icon name="arrowRight" className="size-4 -rotate-45" />
              </a>
            )}
          </section>
          <section aria-labelledby="hours-title" className="flex flex-col gap-2">
            <h2 id="hours-title" className="label-caps text-small text-fg-muted">
              {t.hours}
            </h2>
            <p className="font-mono">
              <Tbc id={outlet.hoursTbc ?? ""}>
                {copy.status.hours(formatClock(outlet.hours.open), formatClock(outlet.hours.close))}
              </Tbc>
            </p>
          </section>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={routes.bookAt(outlet.slug)}>{t.book}</ButtonLink>
            <ButtonLink href={routes.menu} variant="secondary">
              {t.menu}
            </ButtonLink>
          </div>
        </div>
      </div>
    </main>
  );
}
