import { z } from "zod";
import type { DailyHours } from "./hours";

export const OUTLET_SLUGS = ["c-scheme", "raja-park", "vaishali-nagar"] as const;
export type OutletSlug = (typeof OUTLET_SLUGS)[number];

export const outletSeedSchema = z.object({
  source: z.string(),
  outlets: z.array(
    z
      .object({
        slug: z.enum(OUTLET_SLUGS),
        name: z.string(),
        /** Confirmed address. */
        address: z.string().optional(),
        /** Key in src/config/placeholders.ts when the address is not confirmed. */
        addressPlaceholder: z.enum(["rajaParkBuildingNumber", "vaishaliNagarAddress"]).optional(),
      })
      .refine((o) => Boolean(o.address) !== Boolean(o.addressPlaceholder), {
        message: "An outlet has a confirmed address or an address placeholder, not both",
      }),
  ),
});

export interface Outlet {
  readonly slug: OutletSlug;
  readonly name: string;
  readonly address: string;
  /** Placeholder id (P-xx) when the address is not confirmed. */
  readonly addressTbc?: string;
  readonly hours: DailyHours;
  readonly hoursTbc?: string;
}
