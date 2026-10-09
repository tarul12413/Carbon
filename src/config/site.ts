import type { DailyHours } from "@/domain/hours";
import { placeholders } from "./placeholders";

/**
 * Confirmed facts only (source noted per field). Unconfirmed values come from
 * placeholders.ts so they stay visible.
 */

export const site = {
  name: "Carbon",
  city: "Jaipur",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  currency: "INR",
} as const;

export type OutletSlug = "c-scheme" | "raja-park" | "vaishali-nagar";

export interface OutletConfig {
  readonly slug: OutletSlug;
  readonly name: string;
  readonly address: string;
  readonly addressConfirmed: boolean;
  readonly hours: DailyHours;
}

export const outlets: readonly OutletConfig[] = [
  {
    slug: "c-scheme",
    name: "C Scheme",
    address: "F-6A, Ground Floor, Amir Manzil, Ramesh Marg, C Scheme, Jaipur",
    addressConfirmed: true,
    hours: placeholders.openingHours.value,
  },
  {
    slug: "raja-park",
    name: "Raja Park / Tilak Nagar",
    address: `${placeholders.rajaParkBuildingNumber.value}, Jaipur`,
    addressConfirmed: false,
    hours: placeholders.openingHours.value,
  },
  {
    slug: "vaishali-nagar",
    name: "Vaishali Nagar",
    address: placeholders.vaishaliNagarAddress.value,
    addressConfirmed: false,
    hours: placeholders.openingHours.value,
  },
];
