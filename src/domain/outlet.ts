import type { DailyHours } from "./hours";

export const OUTLET_SLUGS = ["c-scheme", "raja-park", "vaishali-nagar"] as const;
export type OutletSlug = (typeof OUTLET_SLUGS)[number];

export const isOutletSlug = (value: string | null | undefined): value is OutletSlug =>
  typeof value === "string" && (OUTLET_SLUGS as readonly string[]).includes(value);

export interface Outlet {
  readonly slug: OutletSlug;
  readonly name: string;
  readonly address: string;
  /** Placeholder id (P-xx) when the address is not confirmed. */
  readonly addressTbc?: string;
  readonly hours: DailyHours;
  readonly hoursTbc?: string;
}
