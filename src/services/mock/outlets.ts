import { z } from "zod";
import seed from "../../../data/outlets.json";
import { placeholders } from "@/config/placeholders";
import { OUTLET_SLUGS, type Outlet } from "@/domain/outlet";
import type { OutletService } from "../outlets";

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

export const mockOutlets: readonly Outlet[] = outletSeedSchema.parse(seed).outlets.map((o) => {
  const tbc = o.addressPlaceholder ? placeholders[o.addressPlaceholder] : undefined;
  const hours = placeholders.openingHours;
  return {
    slug: o.slug,
    name: o.name,
    address: o.address ?? tbc?.value ?? "",
    ...(tbc ? { addressTbc: tbc.id } : {}),
    hours: hours.value,
    hoursTbc: hours.id,
  };
});

export const mockOutletService: OutletService = {
  async listOutlets() {
    return mockOutlets;
  },
  async getOutlet(slug) {
    return mockOutlets.find((o) => o.slug === slug) ?? null;
  },
};
