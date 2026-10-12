import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils.js";
import { placeholders } from "@/config/placeholders";
import { OTP_DIGITS, type OtpChallenge } from "./schema";

/**
 * Sign-in codes for the stamp card (Blueprint section 9). Numbers come from P-25.
 * Codes are stored hashed with their challenge id, never as typed.
 */

export interface OtpRules {
  readonly validMinutes: number;
  readonly maxAttempts: number;
  readonly resendSeconds: number;
  readonly requestsPerHour: number;
}

export const OTP_RULES: OtpRules = placeholders.otpRules.value;

/** Records are deleted within a day (Blueprint section 12, retention). */
export const OTP_RETENTION_MS = 24 * 60 * 60_000;

export function newOtpCode(random: () => number): string {
  return Array.from({ length: OTP_DIGITS }, () => Math.floor(random() * 10)).join("");
}

export function hashOtp(challengeId: string, code: string): string {
  return bytesToHex(sha256(utf8ToBytes(`${challengeId}:${code}`)));
}

export type RequestCheck = { readonly ok: true } | { readonly ok: false; readonly retryAt: string };

/**
 * May this phone ask for another code now? Not within the resend cooldown of the last request, and
 * not more than `requestsPerHour` in the last hour.
 */
export function canRequestOtp(
  challenges: readonly OtpChallenge[],
  phone: string,
  now: Date,
  rules: OtpRules = OTP_RULES,
): RequestCheck {
  const hourAgo = now.getTime() - 60 * 60_000;
  const recent = challenges
    .filter((c) => c.phone === phone && Date.parse(c.createdAt) > hourAgo)
    .map((c) => Date.parse(c.createdAt))
    .sort((a, b) => a - b);
  const last = recent.at(-1);
  if (last !== undefined && now.getTime() < last + rules.resendSeconds * 1000) {
    return { ok: false, retryAt: new Date(last + rules.resendSeconds * 1000).toISOString() };
  }
  const first = recent[0];
  if (first !== undefined && recent.length >= rules.requestsPerHour) {
    return { ok: false, retryAt: new Date(first + 60 * 60_000).toISOString() };
  }
  return { ok: true };
}

export type CodeCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "otp_expired" | "otp_locked" }
  | { readonly ok: false; readonly reason: "otp_invalid"; readonly attemptsLeft: number };

/** Checks a typed code and counts the attempt. Mutates `challenge` (attempts, usedAt). */
export function checkOtp(challenge: OtpChallenge, code: string, now: Date, rules: OtpRules = OTP_RULES): CodeCheck {
  if (challenge.usedAt || now.getTime() >= Date.parse(challenge.expiresAt)) return { ok: false, reason: "otp_expired" };
  if (challenge.attempts >= rules.maxAttempts) return { ok: false, reason: "otp_locked" };
  challenge.attempts += 1;
  if (hashOtp(challenge.id, code) !== challenge.codeHash) {
    const attemptsLeft = rules.maxAttempts - challenge.attempts;
    return attemptsLeft > 0 ? { ok: false, reason: "otp_invalid", attemptsLeft } : { ok: false, reason: "otp_locked" };
  }
  challenge.usedAt = now.toISOString();
  return { ok: true };
}
