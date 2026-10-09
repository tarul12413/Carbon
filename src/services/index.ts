import { mockMenuService } from "./mock/menu";
import { mockOutletService } from "./mock/outlets";
import type { MenuService } from "./menu";
import type { OutletService } from "./outlets";

/** Phase 2 swaps these for real implementations without touching UI code. */
export const services: { readonly menu: MenuService; readonly outlets: OutletService } = {
  menu: mockMenuService,
  outlets: mockOutletService,
};
