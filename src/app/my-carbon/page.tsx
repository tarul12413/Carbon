import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MyCarbon } from "@/components/stamps/MyCarbon";
import { copy } from "@/content/copy";
import { flags } from "@/config/flags";
import type { OutletSlug } from "@/domain/outlet";
import { services } from "@/services";

export const metadata: Metadata = { title: copy.stampCard.title };

/** The stamp card (brief: /my-carbon). Exists only with the stampCard flag on (locked decision). */
export default async function MyCarbonPage() {
  if (!flags.stampCard) notFound();
  const outlets = await services.outlets.listOutlets();
  const outletNames = Object.fromEntries(outlets.map((o) => [o.slug, o.name])) as Record<OutletSlug, string>;
  return (
    <main id="content" className="content-cap fold-left flex max-w-xl flex-col py-8 laptop:py-14">
      <MyCarbon outletNames={outletNames} devPanel={flags.devPanel} />
    </main>
  );
}
