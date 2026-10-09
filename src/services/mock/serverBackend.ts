import { site } from "@/config/site";
import { createBookingBackend, memoryStore, type BookingBackend } from "./bookingBackend";
import { mockOutlets } from "./outlets";

const globalForBookings = globalThis as typeof globalThis & { carbonBookings?: BookingBackend };

/**
 * One in-memory backend per server process, kept on globalThis so dev reloads do not wipe it.
 * On Vercel each serverless instance has its own copy, which is why the hosted demo keeps
 * bookings in the browser instead (D-004).
 */
export const serverBookings: BookingBackend = (globalForBookings.carbonBookings ??= createBookingBackend({
  store: memoryStore(),
  outlets: mockOutlets,
  timeZone: site.timeZone,
}));
