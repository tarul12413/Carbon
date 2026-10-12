import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

const t = copy.notFound;

/** 404 (Blueprint section 4: short copy, links back to the menu and booking). */
export default function NotFound() {
  return (
    <main id="content" className="content-cap flex flex-1 flex-col justify-center gap-6 py-16 laptop:py-28">
      <p className="font-mono text-h2 text-accent" aria-hidden="true">
        404
      </p>
      <h1 className="max-w-3xl text-display font-semibold text-balance">{t.title}</h1>
      <p className="text-h3 text-fg-muted">{t.body}</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink href={routes.home}>{t.home}</ButtonLink>
        <ButtonLink href={routes.menu} variant="secondary">
          {t.menu}
        </ButtonLink>
        <ButtonLink href={routes.book} variant="secondary">
          {t.book}
        </ButtonLink>
      </div>
    </main>
  );
}
