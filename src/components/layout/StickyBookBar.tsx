"use client";

import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

/** Phones only: the primary action in the thumb zone (Blueprint section 6). Hidden in the booking flow itself. */
export function StickyBookBar() {
  const pathname = usePathname();
  if (pathname.startsWith(routes.book)) return null;
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
