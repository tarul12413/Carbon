import type { BookingResult, BookingService } from "../bookings";

/**
 * BookingService over HTTP, against the route handlers in src/app/api. Phase 2 points this at the
 * real API. Errors come back in the same `{ ok, error }` shape the mock returns.
 */
export function createHttpBookingService(base = ""): BookingService {
  const call = async <T>(path: string, init?: RequestInit & { key?: string }): Promise<T> => {
    const headers = new Headers(init?.headers);
    if (init?.body) headers.set("content-type", "application/json");
    if (init?.key) headers.set("idempotency-key", init.key);
    const response = await fetch(`${base}${path}`, { ...init, headers, cache: "no-store" });
    return (await response.json()) as T;
  };
  const post = (path: string, key: string, body?: unknown) =>
    call<BookingResult>(path, { method: "POST", key, body: JSON.stringify(body ?? {}) });
  const at = (code: string) => `/api/bookings/${encodeURIComponent(code)}`;

  return {
    getAvailability: (q) =>
      call(
        `/api/availability?${new URLSearchParams({
          outlet: q.outlet,
          date: q.date,
          partySize: String(q.partySize),
          ...(q.excludeCode ? { excludeCode: q.excludeCode } : {}),
        })}`,
      ),
    createHold: (input, key) => post("/api/bookings", key, input),
    confirm: (code, input, key) => post(`${at(code)}/confirm`, key, input),
    sendRequest: (code, input, key) => post(`${at(code)}/request`, key, input),
    change: (code, input, key) => post(`${at(code)}/change`, key, input),
    cancel: (code, key) => post(`${at(code)}/cancel`, key),
    getBooking: (code) => call(at(code)),
  };
}
