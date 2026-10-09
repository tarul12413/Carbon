import seed from "../../../data/outlets.json";
import { placeholders } from "@/config/placeholders";
import { outletSeedSchema, type Outlet } from "@/domain/outlet";
import type { OutletService } from "../outlets";

const outlets: readonly Outlet[] = outletSeedSchema.parse(seed).outlets.map((o) => {
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
    return outlets;
  },
  async getOutlet(slug) {
    return outlets.find((o) => o.slug === slug) ?? null;
  },
};
