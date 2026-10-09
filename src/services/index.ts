import { mockEventCatalogue } from "./mock/events";
import { mockMenuService } from "./mock/menu";
import { mockOutletService } from "./mock/outlets";
import type { EventCatalogue } from "./events";
import type { MenuService } from "./menu";
import type { OutletService } from "./outlets";

/** Phase 2 swaps these for real implementations without touching UI code. */
export const services: {
  readonly menu: MenuService;
  readonly outlets: OutletService;
  readonly events: EventCatalogue;
} = {
  menu: mockMenuService,
  outlets: mockOutletService,
  events: mockEventCatalogue,
};
