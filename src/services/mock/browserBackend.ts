import { site } from "@/config/site";
import { createBookingBackend } from "./bookingBackend";
import { browserStore } from "./browserStore";
import { mockOutlets } from "./outlets";

/** The hosted demo's booking backend, running in the visitor's browser (D-004). */
export const browserBackend = createBookingBackend({
  store: browserStore(),
  outlets: mockOutlets,
  timeZone: site.timeZone,
});
