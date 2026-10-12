import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LegalText } from "@/components/legal/LegalText";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { cx } from "@/lib/cx";

const t = copy.legal;
const PAGES = ["privacy", "terms", "refunds"] as const;
type LegalPage = (typeof PAGES)[number];
const isLegalPage = (value: string): value is LegalPage => (PAGES as readonly string[]).includes(value);

interface PageProps {
  readonly params: Promise<{ page: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return PAGES.map((page) => ({ page }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { page } = await params;
  return { title: isLegalPage(page) ? t.pages[page].title : t.nav };
}

/** Privacy, terms, cancellation and refunds (brief: placeholder text, clearly marked). */
export default async function LegalPageView({ params }: PageProps) {
  const { page } = await params;
  if (!isLegalPage(page)) notFound();
  const content = t.pages[page];

  return (
    <main id="content" className="content-cap flex max-w-3xl flex-col gap-8 py-8 laptop:py-14">
      <nav aria-label={t.nav}>
        <ul className="flex flex-wrap gap-2">
          {PAGES.map((p) => (
            <li key={p}>
              <Link
                href={routes.legalPage(p)}
                aria-current={p === page ? "page" : undefined}
                className={cx(
                  "inline-flex min-h-11 items-center rounded-full border px-4",
                  p === page ? "border-accent bg-accent text-on-accent" : "border-line-strong hover-fine:border-accent",
                )}
              >
                {t.pages[p].short}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <header className="flex flex-col gap-4">
        <h1 className="text-h1 font-semibold text-balance">{content.title}</h1>
        <p role="note" className="rounded-sm border border-dashed border-accent p-4 text-fg-muted">
          {t.draft}
        </p>
        <p className="text-h3 font-normal text-fg-muted">
          <LegalText text={content.intro} />
        </p>
        {page === "privacy" && (
          <p className="font-mono text-small text-fg-muted">
            {t.version}: <Tbc id={placeholders.noticeVersion.id}>{placeholders.noticeVersion.value}</Tbc>
          </p>
        )}
      </header>

      {content.sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-3 border-t border-line pt-6">
          <h2 className="text-h3 font-semibold">{section.heading}</h2>
          <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-accent">
            {section.items.map((item) => (
              <li key={item} className="max-w-prose">
                <LegalText text={item} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
