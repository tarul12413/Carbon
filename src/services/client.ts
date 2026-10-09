"use client";

import type { BookingService, DemoControls } from "./bookings";
import { createHttpBookingService } from "./http/bookings";

/**
 * Services for client components. The hosted demo keeps bookings in this browser (D-004);
 * NEXT_PUBLIC_BOOKING_TRANSPORT=http sends them to the route handlers instead.
 *
 * The in-browser backend (the mock engine and zod) loads on first use, so pages that only link
 * to booking, and the prefetch of /book, stay light.
 */
const backend = () => import("./mock/browserBackend").then((m) => m.browserBackend);

const local: BookingService & DemoControls = {
  getAvailability: async (query) => (await backend()).getAvailability(query),
  createHold: async (input, key) => (await backend()).createHold(input, key),
  confirm: async (code, input, key) => (await backend()).confirm(code, input, key),
  sendRequest: async (code, input, key) => (await backend()).sendRequest(code, input, key),
  change: async (code, input, key) => (await backend()).change(code, input, key),
  cancel: async (code, key) => (await backend()).cancel(code, key),
  getBooking: async (code) => (await backend()).getBooking(code),
  reset: async () => (await backend()).reset(),
  expireHolds: async () => (await backend()).expireHolds(),
};

export const clientServices: { readonly bookings: BookingService; readonly demo: DemoControls } = {
  bookings: process.env.NEXT_PUBLIC_BOOKING_TRANSPORT === "http" ? createHttpBookingService() : local,
  demo: local,
};
