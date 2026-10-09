import Link from "next/link";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

export interface Brew {
  readonly id: string;
  readonly name: string;
  readonly notes: string;
  readonly steepHours: number;
}

/** Name, notes and steep time. Never a price: the home page has none. */
export function BrewCard({ brew }: { readonly brew: Brew }) {
  return (
    <article className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-4 laptop:p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-h3 font-semibold">{brew.name}</h3>
        <Chip>
          <span className="sr-only">{copy.home.clock.steeped(brew.steepHours)}</span>
          <span aria-hidden="true">{brew.steepHours}h</span>
        </Chip>
      </div>
      <p className="text-fg-muted">{brew.notes}</p>
      <Link
        href={routes.menuItem(brew.id)}
        className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-accent hover-fine:underline"
      >
        {copy.home.clock.seeInMenu}
        <span className="sr-only">: {brew.name}</span>
        <Icon name="arrowRight" className="size-4" />
      </Link>
    </article>
  );
}
