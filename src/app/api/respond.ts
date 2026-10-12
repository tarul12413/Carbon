import { flags } from "@/config/flags";
import { isOutletSlug } from "@/domain/outlet";
import { staffById, type StaffActor } from "@/domain/staff";
import type { ServiceErrorCode, ServiceResult } from "@/services/errors";

const statusFor: Record<ServiceErrorCode, number> = {
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
  sold_out: 409,
  too_many: 409,
  signature_invalid: 400,
  rate_limited: 429,
  otp_invalid: 400,
  otp_expired: 410,
  otp_locked: 429,
  session_expired: 401,
  token_expired: 410,
  too_soon: 409,
  card_full: 409,
  not_enough_stamps: 409,
  pin_invalid: 403,
  already_used: 409,
  forbidden: 403,
};

/** Same `{ ok, value | error }` body as the mock service, with a matching HTTP status. */
export function respond<T>(result: ServiceResult<T>, created = false): Response {
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

/** Stamp card routes do not exist while the feature flag is off (locked decision). */
export function stampCardOff(): Response | null {
  return flags.stampCard ? null : Response.json({ ok: false, error: { code: "not_found" } }, { status: 404 });
}

export const SESSION_COOKIE = "carbon_session";

/** The customer session from its HTTP-only cookie. */
export function sessionFrom(request: Request): string {
  const cookie = request.headers.get("cookie") ?? "";
  const match = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export function sessionCookie(request: Request, session: string | null): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const age = session ? 30 * 24 * 60 * 60 : 0;
  return `${SESSION_COOKIE}=${session ?? ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${secure}`;
}

/**
 * The staff account and outlet. Mock only: Phase 2 takes these from the staff session and a
 * registered device, never from headers the client sets.
 */
export function staffActor(request: Request): StaffActor | Response {
  const staffId = request.headers.get("x-demo-staff") ?? "";
  const outlet = request.headers.get("x-demo-outlet");
  if (staffById(staffId) && isOutletSlug(outlet)) return { staffId, outlet };
  return Response.json({ ok: false, error: { code: "forbidden" } }, { status: 403 });
}
