"use client";

import { useEffect, useState } from "react";
import { copy } from "@/content/copy";
import type { StockState } from "@/domain/events/stock";
import { cx } from "@/lib/cx";
import { clientServices } from "@/services/client";

const t = copy.events;

/** "Few left" or "Sold out" on a poster, from live stock. Shows nothing while on sale or loading. */
export function StockBadge({ slug, className }: { readonly slug: string; readonly className?: string }) {
  const [state, setState] = useState<StockState | null>(null);
  useEffect(() => {
    let live = true;
    clientServices.ticketing.getAvailability(slug).then((result) => {
      if (live && result.ok) setState(result.value.ticketTypes[0]?.state ?? null);
    });
    return () => {
      live = false;
    };
  }, [slug]);
  if (!state || state === "on_sale") return null;
  return (
    <span
      className={cx(
        "rounded-full px-3 py-1 text-small font-semibold",
        state === "sold_out" ? "bg-danger text-carbon-black" : "bg-accent text-on-accent",
        className,
      )}
    >
      {t.stock[state]}
    </span>
  );
}
