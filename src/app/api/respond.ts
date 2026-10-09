import type { BookingErrorCode, BookingResult } from "@/services/bookings";

const statusFor: Record<BookingErrorCode, number> = {
  invalid_input: 400,
  bot_check: 400,
  outside_window: 422,
  party_too_large: 422,
  slot_full: 409,
  not_found: 404,
  hold_expired: 410,
  not_allowed: 409,
  cutoff_passed: 409,
  idempotency_conflict: 422,
};

/** Same `{ ok, value | error }` body as the mock service, with a matching HTTP status. */
export function respond<T>(result: BookingResult<T>, created = false): Response {
  const status = result.ok ? (created ? 201 : 200) : statusFor[result.error.code];
  return Response.json(result, { status, headers: { "cache-control": "no-store" } });
}

/** Writes need an Idempotency-Key header (Blueprint section 9). */
export function idempotencyKey(request: Request): string | Response {
  const key = request.headers.get("idempotency-key")?.trim();
  if (key && key.length <= 200) return key;
  return Response.json(
    { ok: false, error: { code: "invalid_input", fields: { "idempotency-key": "required" } } },
    { status: 400 },
  );
}

export async function jsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
