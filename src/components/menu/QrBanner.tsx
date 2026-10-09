"use client";

import { useSearchParams } from "next/navigation";
import { copy } from "@/content/copy";
import type { OutletSlug } from "@/config/site";

interface QrBannerProps {
  readonly outlets: readonly { readonly slug: OutletSlug; readonly name: string }[];
}

/** Table QR codes open /menu?src=qr&outlet=<slug>. Menu only; no ordering from the QR. */
export function QrBanner({ outlets }: QrBannerProps) {
  const params = useSearchParams();
  if (params.get("src") !== "qr") return null;
  const outlet = outlets.find((o) => o.slug === params.get("outlet"));
  if (!outlet) return null;
  return (
    <p className="rounded-sm border border-line-strong bg-surface-raised px-4 py-3 font-medium" role="status">
      {copy.menu.qr(outlet.name)}
    </p>
  );
}
