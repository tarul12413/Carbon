import { DEMO_STAMP_KEY, readClaims, signClaims } from "@/domain/orders/token";

/**
 * The stamp card QR (Blueprint section 9): a signed token valid for 60 seconds, so a screenshot
 * shared with friends is useless a minute later. The page asks for a fresh one as each expires.
 */
export const STAMP_QR_SECONDS = 60;

export interface StampQrClaims {
  /** Token kind, so a stamp QR is never read as a ticket. */
  readonly k: "stamp";
  /** Customer id. */
  readonly u: string;
  /** Expires at, seconds since epoch. */
  readonly x: number;
}

export function signStampQr(customerId: string, now: Date, key = DEMO_STAMP_KEY): { token: string; expiresAt: string } {
  const x = Math.floor(now.getTime() / 1000) + STAMP_QR_SECONDS;
  return {
    token: signClaims({ k: "stamp", u: customerId, x } satisfies StampQrClaims, key),
    expiresAt: new Date(x * 1000).toISOString(),
  };
}

export type StampQrCheck =
  | { readonly ok: true; readonly customerId: string }
  | { readonly ok: false; readonly reason: "signature_invalid" | "token_expired" };

export function readStampQr(token: string, now: Date, key = DEMO_STAMP_KEY): StampQrCheck {
  const claims = readClaims(token.trim(), key);
  if (!claims || claims.k !== "stamp" || typeof claims.u !== "string" || typeof claims.x !== "number") {
    return { ok: false, reason: "signature_invalid" };
  }
  if (now.getTime() >= claims.x * 1000) return { ok: false, reason: "token_expired" };
  return { ok: true, customerId: claims.u };
}
