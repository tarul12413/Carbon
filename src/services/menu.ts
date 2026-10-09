import type { MenuItem } from "@/domain/menu/schema";

export interface ColdBrew extends MenuItem {
  readonly steepHours: number;
}

export interface MenuService {
  /** The signature cold brews, slowest steep last. */
  listColdBrews(): Promise<readonly ColdBrew[]>;
  /** Items tagged `house-named`: drinks that carry Carbon's name. */
  listHouseSignatures(): Promise<readonly MenuItem[]>;
}
