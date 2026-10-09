import { z } from "zod";
import { LIMITS } from "@/domain/booking/limits";
import { normalizeIndianMobile } from "@/domain/booking/phone";
import { ORDER_STATUSES } from "./machine";

const instant = z.iso.datetime();

const customerSchema = z.object({
  name: z.string(),
  phone: z.string(),
  whatsappOptIn: z.boolean(),
  consent: z.object({ noticeVersion: z.string(), at: instant }),
});

export const paymentAttemptSchema = z.object({
  paymentId: z.string(),
  outcome: z.enum(["captured", "failed", "pending"]),
  at: instant,
});

export const orderSchema = z.object({
  id: z.string().regex(/^ord_[a-z0-9]{10}$/),
  kind: z.enum(["tickets", "deposit"]),
  status: z.enum(ORDER_STATUSES),
  /** Tickets: which event and how many seats. */
  eventSlug: z.string().optional(),
  ticketTypeId: z.string().optional(),
  quantity: z.number().int().positive(),
  /** Snapshot of the event's start, so a ticket keeps its date. */
  startsAt: instant,
  /** Deposit: the table booking it pays for. */
  bookingCode: z.string().optional(),
  /** The amount is unknown until Carbon sets prices (P-03, P-04). The server never takes it from the client. */
  amountPaise: z.number().int().nonnegative().nullable(),
  holdExpiresAt: instant,
  customer: customerSchema.optional(),
  method: z.enum(["online", "cafe"]).optional(),
  gatewayOrderId: z.string().optional(),
  attempts: z.array(paymentAttemptSchema),
  /** Pay at the cafe: seats released if unpaid by then (P-22). */
  cafeDeadline: instant.optional(),
  ticketCode: z.string().optional(),
  waitlistId: z.string().optional(),
  refund: z.object({ at: instant, reason: z.enum(["customer", "seats_gone", "booking_expired"]) }).optional(),
  createdAt: instant,
  history: z.array(z.object({ status: z.enum(ORDER_STATUSES), at: instant })),
});
export type Order = z.infer<typeof orderSchema>;

export const ticketSchema = z.object({
  code: z.string().regex(/^CRB-E-\d{4}$/),
  orderId: z.string(),
  eventSlug: z.string(),
  quantity: z.number().int().positive(),
  /** Signed token encoded in the QR (see token.ts). */
  token: z.string(),
  paid: z.boolean(),
  status: z.enum(["valid", "cancelled"]),
  checkedInAt: instant.nullable(),
  issuedAt: instant,
});
export type Ticket = z.infer<typeof ticketSchema>;

export const waitlistEntrySchema = z.object({
  id: z.string().regex(/^wl_[a-z0-9]{10}$/),
  eventSlug: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().int().positive(),
  phone: z.string(),
  whatsappOptIn: z.boolean(),
  consent: z.object({ noticeVersion: z.string(), at: instant }),
  status: z.enum(["waiting", "offered", "claimed", "lapsed"]),
  offerExpiresAt: instant.optional(),
  source: z.enum(["web", "seed"]),
  createdAt: instant,
});
export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>;

export const webhookEventSchema = z.object({
  id: z.string(),
  type: z.enum(["payment.captured", "payment.failed", "payment.pending"]),
  gatewayOrderId: z.string(),
  paymentId: z.string(),
  receivedAt: instant,
});
export type WebhookEvent = z.infer<typeof webhookEventSchema>;

const contact = {
  phone: z.string().transform((value, ctx) => {
    const phone = normalizeIndianMobile(value);
    if (!phone) ctx.addIssue({ code: "custom", message: "phone.invalid" });
    return phone ?? "";
  }),
  whatsappOptIn: z.boolean(),
  privacyAccepted: z.boolean().refine((accepted) => accepted, "privacy.required"),
  noticeVersion: z.string().min(1),
  website: z.string().max(0, "bot"),
};

export const createOrderInputSchema = z.object({
  eventSlug: z.string().min(1),
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1),
  /** Claiming a waitlist offer. */
  waitlistId: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const depositOrderInputSchema = z.object({ bookingCode: z.string().min(1) });
export type DepositOrderInput = z.infer<typeof depositOrderInputSchema>;

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "name.required").max(LIMITS.name, "name.long"),
  ...contact,
});
export type CustomerInput = z.input<typeof customerInputSchema>;

export const checkoutInputSchema = z.object({
  method: z.enum(["online", "cafe"]),
  customer: customerInputSchema.optional(),
});
export type CheckoutInput = z.input<typeof checkoutInputSchema>;

export const joinWaitlistInputSchema = z.object({
  eventSlug: z.string().min(1),
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1),
  ...contact,
});
export type JoinWaitlistInput = z.input<typeof joinWaitlistInputSchema>;
