import type { Metadata } from "next";
import { OutletCard } from "@/components/outlets/OutletCard";
import { OutletStatus } from "@/components/outlets/OutletStatus";
import { copy } from "@/content/copy";
import { site } from "@/config/site";
import { services } from "@/services";

const t = copy.outlets;

export const metadata: Metadata = { title: t.title };

export default async function OutletsPage() {
  const outlets = await services.outlets.listOutlets();
  return (
    <main id="content" className="content-cap flex flex-col gap-12 py-12 laptop:py-20">
      <header className="flex flex-col gap-3">
        <p className="label-caps text-small text-fg-muted">{t.eyebrow}</p>
        <h1 className="text-h1 font-semibold">{t.heading}</h1>
        <p className="text-fg-muted">{t.intro}</p>
      </header>
      <ul className="fold-grid gap-y-12 laptop:grid-cols-3 laptop:gap-x-12">
        {outlets.map((outlet) => (
          <li key={outlet.slug} className="flex flex-col gap-3">
            <OutletCard outlet={outlet} as="h2" />
            <OutletStatus hours={outlet.hours} timeZone={site.timeZone} className="text-small" />
          </li>
        ))}
      </ul>
    </main>
  );
}
