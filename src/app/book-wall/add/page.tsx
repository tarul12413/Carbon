import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { AddBookForm } from "@/components/wall/AddBookForm";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

const t = copy.wall;

export const metadata: Metadata = { title: t.addTitle };

export default function AddBookPage() {
  return (
    <main id="content" className="content-cap flex max-w-xl flex-col gap-6 py-8 laptop:py-14">
      <Link href={routes.bookWall} className="inline-flex min-h-11 items-center gap-2 self-start text-fg-muted">
        <Icon name="arrowLeft" />
        {t.back}
      </Link>
      <AddBookForm />
    </main>
  );
}
