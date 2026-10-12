import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Icon } from "@/components/ui/Icon";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { flags } from "@/config/flags";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { formatClock } from "@/domain/hours";
import { services } from "@/services";
import { primaryNav } from "./navItems";

const hours = placeholders.openingHours;
const whatsappHref = `https://wa.me/${placeholders.whatsappNumber.value.replace(/\D/g, "")}`;

export async function SiteFooter() {
  const outlets = await services.outlets.listOutlets();
  return (
    <footer className="mt-auto border-t border-line bg-surface-raised">
      <div className="content-cap grid gap-10 py-12 tablet:grid-cols-2 laptop:grid-cols-4">
        <div className="flex flex-col gap-4">
          <Logo withTagline className="text-[1.375rem]" />
          <p className="text-fg-muted">{copy.footer.line}</p>
        </div>

        <section aria-labelledby="footer-hours" className="flex flex-col gap-3">
          <h2 id="footer-hours" className="label-caps text-small text-fg-muted">
            {copy.footer.hours}
          </h2>
          <p className="font-mono">
            <Tbc id={hours.id}>{copy.status.hours(formatClock(hours.value.open), formatClock(hours.value.close))}</Tbc>
          </p>
          <a href={whatsappHref} className="inline-flex min-h-11 items-center gap-2 text-accent">
            <Icon name="chat" />
            <Tbc id={placeholders.whatsappNumber.id}>{copy.footer.whatsapp}</Tbc>
          </a>
        </section>

        <section aria-labelledby="footer-outlets" className="flex flex-col gap-3">
          <h2 id="footer-outlets" className="label-caps text-small text-fg-muted">
            {copy.footer.outlets}
          </h2>
          <ul className="flex flex-col gap-3">
            {outlets.map((outlet) => (
              <li key={outlet.slug}>
                <Link href={routes.outlet(outlet.slug)} className="font-medium hover-fine:text-accent">
                  {outlet.name}
                </Link>
                <p className="text-small text-fg-muted">{outlet.address}</p>
              </li>
            ))}
          </ul>
        </section>

        <nav aria-labelledby="footer-explore" className="flex flex-col gap-3">
          <h2 id="footer-explore" className="label-caps text-small text-fg-muted">
            {copy.footer.explore}
          </h2>
          <ul className="flex flex-col">
            {[
              ...primaryNav,
              ...(flags.stampCard ? [{ href: routes.myCarbon, label: copy.nav.myCarbon }] : []),
              { href: routes.enquire, label: copy.nav.enquire },
              { href: routes.legal, label: copy.footer.legal },
            ].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center hover-fine:text-accent">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <p className="content-cap py-4 text-small text-fg-muted">{copy.footer.demo}</p>
      </div>
    </footer>
  );
}
