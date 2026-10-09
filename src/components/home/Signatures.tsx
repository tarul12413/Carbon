import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import type { MenuItem } from "@/domain/menu/schema";

const t = copy.home.signatures;

/** Drinks that carry Carbon's name, from menu page 8. Names and descriptions only; no prices on the home page. */
export function Signatures({ items }: { readonly items: readonly MenuItem[] }) {
  return (
    <section aria-labelledby="signatures-title" className="border-t border-line">
      <div className="content-cap flex flex-col gap-10 py-16 laptop:py-24">
        <SectionHeading id="signatures-title" eyebrow={t.eyebrow}>
          {t.title}
        </SectionHeading>
        <ul className="grid gap-px overflow-hidden rounded-md border border-line bg-line tablet:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 bg-surface p-6">
              <h3 className="label-caps text-body">{item.name}</h3>
              <p className="text-fg-muted">{item.notes}</p>
              {item.servedHot && <p className="font-mono text-small text-accent">{t.servedHot}</p>}
            </li>
          ))}
        </ul>
        <Link href={routes.menu} className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-accent">
          {t.cta}
          <Icon name="arrowRight" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
