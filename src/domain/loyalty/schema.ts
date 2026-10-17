import { z } from "zod";
import { normalizeIndianMobile } from "@/domain/booking/phone";
import { OUTLET_SLUGS } from "@/domain/outlet";

const instant = z.iso.datetime();
const consent = z.object({ noticeVersion: z.string(), at: instant });

/** Blueprint section 9: customers. One phone number is one card. */
export const customerSchema = z.object({
  id: z.string().regex(/^cus_[a-z0-9]{10}$/),
  /** E.164. Phase 2 stores it encrypted, with a hash for lookup. */
  phone: z.string(),
  /** Optional, shown to the barista. Seed customers have sample names. */
  name: z.string().optional(),
  consent,
  source: z.enum(["web", "seed"]),
  createdAt: instant,
});
export type Customer = z.infer<typeof customerSchema>;

/** Blueprint section 9: otp_challenges. Never stores the code itself. */
export const otpChallengeSchema = z.object({
  id: z.string().regex(/^otp_[a-z0-9]{10}$/),
  phone: z.string(),
  codeHash: z.string(),
  consent,
  attempts: z.number().int().nonnegative(),
  usedAt: instant.nullable(),
  expiresAt: instant,
  createdAt: instant,
});
export type OtpChallenge = z.infer<typeof otpChallengeSchema>;

/** A customer session (Phase 2: a secure, HTTP-only cookie, 30 days, sliding). */
export const customerSessionSchema = z.object({
  id: z.string().regex(/^ses_[a-z0-9]{10}$/),
  customerId: z.string(),
  expiresAt: instant,
});
export type CustomerSession = z.infer<typeof customerSessionSchema>;

/** Blueprint section 9: stamp_ledger. Append-only; the balance is the sum. */
export const stampEntrySchema = z.object({
  id: z.string().regex(/^stp_[a-z0-9]{10}$/),
  customerId: z.string(),
  delta: z.number().int(),
  reason: z.enum(["visit", "undo", "redeem"]),
  /** For an undo: the visit it takes back. */
  undoes: z.string().optional(),
  outlet: z.enum(OUTLET_SLUGS),
  staffId: z.string(),
  at: instant,
});
export type StampEntry = z.infer<typeof stampEntrySchema>;

/** Blueprint section 9: rewards. One redemption per reward. */
export const rewardSchema = z.object({
  id: z.string().regex(/^rwd_[a-z0-9]{10}$/),
  customerId: z.string(),
  issuedAt: instant,
  redeemedAt: instant.nullable(),
  staffId: z.string().optional(),
  outlet: z.enum(OUTLET_SLUGS).optional(),
});
export type Reward = z.infer<typeof rewardSchema>;

export { auditEntrySchema, type AuditEntry } from "@/domain/audit";

export const otpRequestInputSchema = z.object({
  phone: z.string().transform((value, ctx) => {
    const phone = normalizeIndianMobile(value);
    if (!phone) ctx.addIssue({ code: "custom", message: "phone.invalid" });
    return phone ?? "";
  }),
  privacyAccepted: z.boolean().refine((accepted) => accepted, "consent.required"),
  noticeVersion: z.string().min(1),
  /** Honeypot (the bot check): hidden from people, must stay empty. */
  website: z.string().max(0, "bot"),
});
export type OtpRequestInput = z.input<typeof otpRequestInputSchema>;

export const otpVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, "code.format"),
});
export type OtpVerifyInput = z.infer<typeof otpVerifyInputSchema>;

export const OTP_DIGITS = 6;
