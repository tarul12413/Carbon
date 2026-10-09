import type { Menu, MenuItem } from "@/domain/menu/schema";

export interface ColdBrew extends MenuItem {
  readonly steepHours: number;
}

/** The downloadable printed menu. Admin replaces it in Phase 2 (Blueprint: menu_documents). */
export interface MenuDocument {
  readonly href: string;
  readonly label: string;
  /** Edition printed on the menu itself. */
  readonly edition: string;
  /** When this file was added to the site (ISO date). */
  readonly uploadedAt: string;
  readonly bytes: number;
  readonly pages: number;
}

export interface MenuService {
  getMenu(): Promise<Menu>;
  /** The signature cold brews, slowest steep last. */
  listColdBrews(): Promise<readonly ColdBrew[]>;
  /** Cold brews, then the drinks that carry Carbon's name. */
  listSignatures(): Promise<readonly MenuItem[]>;
  /** Drinks that carry Carbon's name, in menu order. */
  listHouseSignatures(): Promise<readonly MenuItem[]>;
  getMenuDocument(): Promise<MenuDocument>;
}
