import type { Metadata } from "next";
import { RetryButton } from "@/components/system/RetryButton";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

const t = copy.offline;

export const metadata: Metadata = { title: t.title };

/** Shown by the service worker (public/sw.js) when a page is not cached and there is no network. */
export default function OfflinePage() {
  return (
    <main id="content" className="content-cap flex flex-1 flex-col justify-center gap-6 py-16 laptop:py-28">
      <h1 className="max-w-3xl text-display font-semibold text-balance">{t.title}</h1>
      <p className="max-w-prose text-h3 text-fg-muted">{t.body}</p>
      <div className="flex flex-wrap gap-3">
        <RetryButton label={t.retry} />
        <ButtonLink href={routes.home} variant="secondary">
          {t.home}
        </ButtonLink>
      </div>
    </main>
  );
}
