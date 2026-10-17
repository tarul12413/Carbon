import type { Metadata } from "next";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Shelf } from "@/components/wall/Shelf";
import { copy } from "@/content/copy";
import { flags } from "@/config/flags";
import { routes } from "@/config/routes";

const t = copy.wall;

export const metadata: Metadata = { title: t.title };

/** The book wall (Blueprint 5.6). Entries live in this browser in the demo (D-026), so the shelf loads there. */
export default function BookWallPage() {
  return (
    <main id="content" className="flex flex-1 flex-col">
      <div className="content-cap flex flex-col gap-8 py-8 laptop:py-14">
        <header className="flex flex-col gap-3">
          <h1 className="text-display font-semibold text-balance">{t.title}</h1>
          <p className="text-h3 text-fg-muted">{t.lead}</p>
          <p className="text-small text-fg-muted">{t.sample}</p>
        </header>
        <Shelf />
        <ButtonLink href={routes.bookWallAdd} className="w-full tablet:w-auto tablet:self-start">
          <Icon name="book" />
          {t.add}
        </ButtonLink>
      </div>
      {flags.devPanel && (
        <DemoPanel>
          <ButtonLink variant="secondary" href={routes.adminSection("wall")}>
            {copy.booking.demo.moderate}
          </ButtonLink>
        </DemoPanel>
      )}
    </main>
  );
}
