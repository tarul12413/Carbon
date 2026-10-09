import type { Outlet, OutletSlug } from "@/domain/outlet";

export interface OutletService {
  listOutlets(): Promise<readonly Outlet[]>;
  getOutlet(slug: string): Promise<Outlet | null>;
}

export type { Outlet, OutletSlug };
