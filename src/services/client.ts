"use client";

import type { BookingService } from "./bookings";
import type { DemoControls } from "./demo";
import { createHttpBookingService } from "./http/bookings";
import type { MockBackend } from "./mock/mockBackend";
import type { LoyaltyService } from "./loyalty";
import type { StaffService } from "./staff";
import type { DemoGateway, TicketingService } from "./ticketing";

/**
 * Services for client components. The hosted demo keeps its data in this browser (D-026);
 * NEXT_PUBLIC_BOOKING_TRANSPORT=http sends bookings to the route handlers instead.
 *
 * The in-browser backend (the mock engines and zod) loads on first use, and never before the page
 * has loaded and gone idle, so it does not compete with the first paint. Pages that only link to
 * booking or events, and their prefetches, stay light.
 */
const idle = (resolve: () => void) =>
  "requestIdleCallback" in window
    ? window.requestIdleCallback(() => resolve(), { timeout: 1500 })
    : setTimeout(resolve, 200);
const pageLoaded = () =>
  new Promise<void>((resolve) => {
    if (document.readyState === "complete") idle(resolve);
    else window.addEventListener("load", () => idle(resolve), { once: true });
  });
const backend = () =>
  pageLoaded()
    .then(() => import("./mock/browserBackend"))
    .then((m) => m.browserBackend);

/** A service whose every method waits for the backend to load, then calls through. */
function deferred<K extends keyof MockBackend>(name: K): MockBackend[K] {
  return new Proxy({} as MockBackend[K], {
    get:
      (_target, method) =>
      async (...args: unknown[]) => {
        const service = (await backend())[name];
        const fn = Reflect.get(service, method) as (...a: unknown[]) => Promise<unknown>;
        return fn.apply(service, args);
      },
  });
}

export const clientServices: {
  readonly bookings: BookingService;
  readonly ticketing: TicketingService;
  readonly gateway: DemoGateway;
  readonly loyalty: LoyaltyService;
  readonly staff: StaffService;
  readonly demo: DemoControls;
} = {
  bookings: process.env.NEXT_PUBLIC_BOOKING_TRANSPORT === "http" ? createHttpBookingService() : deferred("bookings"),
  ticketing: deferred("ticketing"),
  gateway: deferred("gateway"),
  loyalty: deferred("loyalty"),
  staff: deferred("staff"),
  demo: deferred("demo"),
};
