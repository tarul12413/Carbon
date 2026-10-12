import { z } from "zod";
import { normalizeIndianMobile } from "./booking/phone";
import { OUTLET_SLUGS } from "./outlet";
import { isLocalDate } from "./time";

/** The brief's four kinds of enquiry (/enquire). */
export const ENQUIRY_TYPES = ["catering", "collab", "workshop", "other"] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const isEnquiryType = (value: string | null | undefined): value is EnquiryType =>
  typeof value === "string" && (ENQUIRY_TYPES as readonly string[]).includes(value);

export const ENQUIRY_LIMITS = { name: 60, details: 600, detailsMin: 10, guestsMax: 2000 } as const;

const instant = z.iso.datetime();

/** Blueprint section 9: enquiries (type, name, phone, details, status). */
export const enquirySchema = z.object({
  code: z.string().regex(/^ENQ-\d{4}$/),
  type: z.enum(ENQUIRY_TYPES),
  name: z.string(),
  phone: z.string(),
  outlet: z.enum(OUTLET_SLUGS).optional(),
  date: z.string().optional(),
  guests: z.number().int().positive().optional(),
  details: z.string(),
  whatsappOptIn: z.boolean(),
  consent: z.object({ noticeVersion: z.string(), at: instant }),
  status: z.enum(["new", "replied", "closed"]),
  createdAt: instant,
});
export type Enquiry = z.infer<typeof enquirySchema>;

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

export const enquiryInputSchema = z.object({
  type: z.enum(ENQUIRY_TYPES, "type.required"),
  name: z.string().trim().min(1, "name.required").max(ENQUIRY_LIMITS.name, "name.long"),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizeIndianMobile(value);
    if (!phone) ctx.addIssue({ code: "custom", message: "phone.invalid" });
    return phone ?? "";
  }),
  outlet: optional(z.enum(OUTLET_SLUGS)),
  date: optional(z.string().refine(isLocalDate, "date.invalid")),
  guests: optional(
    z.coerce.number().int("guests.invalid").min(1, "guests.invalid").max(ENQUIRY_LIMITS.guestsMax, "guests.invalid"),
  ),
  details: z
    .string()
    .trim()
    .min(ENQUIRY_LIMITS.detailsMin, "details.short")
    .max(ENQUIRY_LIMITS.details, "details.long"),
  whatsappOptIn: z.boolean(),
  privacyAccepted: z.boolean().refine((accepted) => accepted, "privacy.required"),
  noticeVersion: z.string().min(1),
  website: z.string().max(0, "bot"),
});
export type EnquiryInput = z.input<typeof enquiryInputSchema>;
