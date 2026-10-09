import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { PlaceholderFrame } from "@/components/ui/PlaceholderFrame";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import type { Outlet } from "@/domain/outlet";
import { OutletAddress } from "./OutletAddress";

const t = copy.home.outlets;

interface OutletCardProps {
  readonly outlet: Outlet;
  /** Heading level inside the page outline. */
  readonly as?: "h2" | "h3";
}

export function OutletCard({ outlet, as: Heading = "h3" }: OutletCardProps) {
  return (
    <article className="flex h-full flex-col gap-4">
      <PlaceholderFrame label={t.photo(outlet.name)} className="aspect-[4/3]" />
      <Heading className="text-h3 font-semibold">
        <Link href={routes.outlet(outlet.slug)} className="hover-fine:text-accent">
          {outlet.name}
        </Link>
      </Heading>
      <OutletAddress outlet={outlet} />
      <div className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2">
        <ButtonLink href={routes.bookAt(outlet.slug)} variant="secondary">
          {t.book}
          <span className="sr-only">: {outlet.name}</span>
        </ButtonLink>
        <Link href={routes.outlet(outlet.slug)} className="inline-flex min-h-11 items-center text-accent">
          {t.details}
          <span className="sr-only">: {outlet.name}</span>
        </Link>
      </div>
    </article>
  );
}
