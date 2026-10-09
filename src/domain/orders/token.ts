import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * Signed tokens for ticket QRs and the sample gateway's payment signatures.
 * HMAC-SHA256, so a QR cannot be forged or edited without the key. In the demo the keys below are
 * public placeholders and signing runs wherever the mock runs; Phase 2 signs on the server with
 * secrets from the environment and never ships them to the browser.
 */
export const DEMO_TICKET_KEY = "carbon-demo-ticket-key-not-a-secret";
export const DEMO_GATEWAY_KEY = "carbon-demo-gateway-key-not-a-secret";

const base64url = (bytes: Uint8Array) => {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64url = (text: string) => {
  const binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
};

export function signature(message: string, key: string): string {
  return base64url(hmac(sha256, utf8ToBytes(key), utf8ToBytes(message)));
}

/** Constant-time comparison, so timing does not leak how much of a signature matched. */
export function sameSignature(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface TicketClaims {
  /** Ticket code. */
  readonly c: string;
  /** Event slug. */
  readonly e: string;
  /** Seats it admits. */
  readonly q: number;
  /** Issued at, seconds since epoch. */
  readonly i: number;
}

export function signTicket(claims: TicketClaims, key = DEMO_TICKET_KEY): string {
  const body = base64url(utf8ToBytes(JSON.stringify(claims)));
  return `${body}.${signature(body, key)}`;
}

export function verifyTicket(token: string, key = DEMO_TICKET_KEY): TicketClaims | null {
  const [body, sig, extra] = token.split(".");
  if (!body || !sig || extra !== undefined || !sameSignature(sig, signature(body, key))) return null;
  try {
    const claims = JSON.parse(new TextDecoder().decode(fromBase64url(body))) as TicketClaims;
    return typeof claims.c === "string" && typeof claims.q === "number" ? claims : null;
  } catch {
    return null;
  }
}
