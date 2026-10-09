import { z } from "zod";
import { OUTLET_SLUGS } from "@/domain/outlet";
import { isLocalDate } from "@/domain/time";
import { LIMITS } from "./limits";
import { normalizeIndianMobile } from "./phone";

export const BOOKING_STATUSES = [
  "held",
  "requested",
  "confirmed",
  "expired",
  "declined",
  "cancelled",
  "completed",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const localDate = z.string().refine(isLocalDate, "Expected a date as YYYY-MM-DD");
const slotTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");
const instant = z.iso.datetime();

export const bookingSchema = z.object({
  code: z.string().regex(/^CRB-\d{4}$/),
  outlet: z.enum(OUTLET_SLUGS),
  date: localDate,
  time: slotTime,
  startsAt: instant,
  partySize: z.number().int().positive(),
  /** Decided once, when the hold is made: instant confirmation or a request to staff. */
  kind: z.enum(["instant", "request"]),
  status: z.enum(BOOKING_STATUSES),
  name: z.string(),
  /** E.164, e.g. +919000000001. */
  phone: z.string(),
  note: z.string(),
  whatsappOptIn: z.boolean(),
  consent: z.object({ noticeVersion: z.string(), at: instant }),
  holdExpiresAt: instant,
  payment: z.enum(["cafe", "online"]).optional(),
  request: z.object({ occasion: z.string(), budgetPerHead: z.string() }).optional(),
  source: z.enum(["web", "seed"]),
  createdAt: instant,
  history: z.array(z.object({ status: z.enum(BOOKING_STATUSES), at: instant })),
});
export type Booking = z.infer<typeof bookingSchema>;

/** Step 4 of the flow. Shared by the form (inline errors) and the service (authoritative check). */
export const holdInputSchema = z.object({
  outlet: z.enum(OUTLET_SLUGS),
  date: localDate,
  time: slotTime,
  partySize: z.number().int().min(1),
  name: z.string().trim().min(1, "name.required").max(LIMITS.name, "name.long"),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizeIndianMobile(value);
    if (!phone) ctx.addIssue({ code: "custom", message: "phone.invalid" });
    return phone ?? "";
  }),
  note: z.string().trim().max(LIMITS.note, "note.long"),
  whatsappOptIn: z.boolean(),
  privacyAccepted: z.literal(true, "privacy.required"),
  noticeVersion: z.string().min(1),
  /** Honeypot: hidden from people, filled in by naive bots. Must stay empty. */
  website: z.string().max(0, "bot"),
});
export type HoldInput = z.input<typeof holdInputSchema>;

export const confirmInputSchema = z.object({ payment: z.literal("cafe") });
export type ConfirmInput = z.infer<typeof confirmInputSchema>;

export const requestInputSchema = z.object({
  occasion: z.string().trim().min(1, "occasion.required").max(LIMITS.occasion, "occasion.long"),
  budgetPerHead: z.string().trim().max(LIMITS.budget, "budget.long"),
});
export type RequestInput = z.input<typeof requestInputSchema>;

export const changeInputSchema = z.object({ date: localDate, time: slotTime });
export type ChangeInput = z.infer<typeof changeInputSchema>;

export const availabilityQuerySchema = z.object({
  outlet: z.enum(OUTLET_SLUGS),
  date: localDate,
  partySize: z.coerce.number().int().min(1),
  /** A booking being moved: its own seats do not count. */
  excludeCode: z.string().optional(),
});
export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
