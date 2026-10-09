import { mockMenuService } from "./mock/menu";
import type { MenuService } from "./menu";

/** Phase 2 swaps these for real implementations without touching UI code. */
export const services: { readonly menu: MenuService } = {
  menu: mockMenuService,
};
