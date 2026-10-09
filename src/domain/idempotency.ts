/**
 * Idempotency keys (Blueprint section 9: "Every write endpoint accepts an idempotency key so a
 * double tap or a retry cannot create two bookings or two payments").
 *
 * A successful write is remembered under its key with a fingerprint of the request. The same key
 * and the same request get the remembered response without running the write again. The same key
 * with a different request is refused. Failures are not remembered, so a retry can succeed.
 */

export interface IdempotencyRecord<T> {
  readonly fingerprint: string;
  readonly at: string;
  readonly response: T;
}

export type IdempotencyLedger<T> = Record<string, IdempotencyRecord<T>>;

export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60_000;

/** Stable fingerprint: object keys sorted at every level. */
export function fingerprint(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}

export type IdempotentOutcome<T, E> =
  | { readonly kind: "fresh"; readonly ok: true; readonly value: T }
  | { readonly kind: "replayed"; readonly ok: true; readonly value: T }
  | { readonly kind: "failed"; readonly ok: false; readonly error: E }
  | { readonly kind: "conflict"; readonly ok: false };

export function runIdempotent<T, E>(
  ledger: IdempotencyLedger<T>,
  key: string,
  request: unknown,
  now: Date,
  write: () => { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E },
): IdempotentOutcome<T, E> {
  for (const [k, record] of Object.entries(ledger)) {
    if (now.getTime() - Date.parse(record.at) > IDEMPOTENCY_TTL_MS) delete ledger[k];
  }
  const print = fingerprint(request);
  const seen = ledger[key];
  if (seen) {
    return seen.fingerprint === print
      ? { kind: "replayed", ok: true, value: seen.response }
      : { kind: "conflict", ok: false };
  }
  const result = write();
  if (!result.ok) return { kind: "failed", ok: false, error: result.error };
  ledger[key] = { fingerprint: print, at: now.toISOString(), response: result.value };
  return { kind: "fresh", ok: true, value: result.value };
}
