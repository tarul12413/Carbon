"use client";

import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

/**
 * Pages with their own primary action, where a second one would only cover it. Each entry covers the
 * page and the pages under it ("/book" and "/book/CRB-1234", not "/book-wall"); "/events/" covers only
 * the event pages, not the list.
 */
const OWN_ACTION = [
  routes.book,
  "/checkout",
  "/tickets",
  `${routes.events}/`,
  routes.myCarbon,
  routes.staff,
  routes.bookWall,
  routes.enquire,
];

const covers = (path: string, entry: string) =>
  entry.endsWith("/") ? path.startsWith(entry) : path === entry || path.startsWith(`${entry}/`);

/** Phones only: the primary action in the thumb zone (Blueprint section 6). */
export function StickyBookBar() {
  const pathname = usePathname();
  if (OWN_ACTION.some((entry) => covers(pathname, entry))) return null;
  return (
    <>
      <div className="h-(--sticky-bar)" aria-hidden="true" />
      <div
        data-sticky-bar
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] tablet:hidden"
      >
        <ButtonLink href={routes.book} className="w-full">
          {copy.booking.stickyBook}
        </ButtonLink>
      </div>
    </>
  );
}
