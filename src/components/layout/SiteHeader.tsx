import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import { MobileNav } from "./MobileNav";
import { primaryNav } from "./navItems";

export function SiteHeader() {
  return (
    <header className="relative z-40 border-b border-line bg-surface">
      <div className="content-cap flex h-16 items-center justify-between gap-4 laptop:h-20">
        <Link href={routes.home} aria-label={copy.nav.home} className="rounded-sm text-[1.125rem]">
          <Logo assemble />
        </Link>
        <nav aria-label={copy.nav.label} className="hidden laptop:block">
          <ul className="flex items-center gap-8">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-fg-muted transition-colors hover-fine:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <ButtonLink href={routes.book} className="hidden tablet:inline-flex">
            {copy.nav.book}
          </ButtonLink>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
