import type { Metadata } from "next";
import { Suspense } from "react";
import { MenuBrowser } from "@/components/menu/MenuBrowser";
import { QrBanner } from "@/components/menu/QrBanner";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { periodicElements } from "@/domain/menu/browse";
import { services } from "@/services";

const t = copy.menu;

export const metadata: Metadata = { title: t.title };

const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default async function MenuPage() {
  const [menu, document, outlets] = await Promise.all([
    services.menu.getMenu(),
    services.menu.getMenuDocument(),
    services.outlets.listOutlets(),
  ]);
  const elements = periodicElements(menu.items);

  return (
    <main id="content" data-theme="paper" className="bg-surface text-fg">
      <div className="content-cap flex flex-col gap-8 py-10 laptop:py-16">
        <header className="flex flex-col gap-4">
          <Suspense fallback={null}>
            <QrBanner outlets={outlets.map(({ slug, name }) => ({ slug, name }))} />
          </Suspense>
          <h1 className="text-h1 font-semibold">{t.heading}</h1>
          <p className="max-w-prose text-fg-muted">{t.intro}</p>
        </header>

        <MenuBrowser menu={menu} elements={elements} />

        <footer className="flex flex-col gap-6 border-t border-line pt-8">
          <p className="italic">{t.dietary}</p>
          <div className="flex flex-col gap-2">
            <a
              href={document.href}
              download
              className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-accent underline underline-offset-4"
            >
              <Icon name="arrowDown" />
              {t.pdf.download}
            </a>
            <p className="font-mono text-small text-fg-muted">
              {t.pdf.meta(document.edition, document.pages, megabytes(document.bytes))}
            </p>
            <p className="text-small text-fg-muted">{t.pdf.note}</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
