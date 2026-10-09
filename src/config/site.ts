/** Site-wide constants. Outlet data lives in data/outlets.json behind services.outlets. */

export const site = {
  name: "Carbon",
  city: "Jaipur",
  timeZone: "Asia/Kolkata",
  locale: "en-IN",
  currency: "INR",
} as const;

export type { OutletSlug } from "@/domain/outlet";
