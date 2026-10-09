import { site } from "@/config/site";
import { browserStore } from "./browserStore";
import { createMockBackend } from "./mockBackend";
import { mockOutlets } from "./outlets";

/** The hosted demo's backend, running in the visitor's browser (D-026). */
export const browserBackend = createMockBackend({
  store: browserStore(),
  outlets: mockOutlets,
  timeZone: site.timeZone,
});
