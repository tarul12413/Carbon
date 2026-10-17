import { z } from "zod";
import { OUTLET_SLUGS } from "@/domain/outlet";
import { isLocalDate } from "@/domain/time";
import { ADMIN_LIMITS } from "./limits";

export { ADMIN_LIMITS } from "./limits";

const instant = z.iso.datetime();
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time.invalid");
const localDate = z.string().refine(isLocalDate, "date.invalid");

/* Capacity and hours (Blueprint section 10). Saved per outlet; anything not saved falls back to the placeholders. */

export const blackoutSchema = z.object({ date: localDate, note: z.string() });
export type Blackout = z.infer<typeof blackoutSchema>;

export const outletSettingsSchema = z.object({
  open: clock,
  close: clock,
  capacityPerSlot: z.number().int(),
  blackouts: z.array(blackoutSchema),
});
export type OutletSettings = z.infer<typeof outletSettingsSchema>;

export const outletSettingsInputSchema = z.object({
  open: clock,
  close: clock,
  capacityPerSlot: z.coerce
    .number()
    .int("capacity.invalid")
    .min(1, "capacity.invalid")
    .max(ADMIN_LIMITS.capacityMax, "capacity.invalid"),
  blackouts: z
    .array(
      z.object({
        date: localDate,
        note: z.string().trim().max(ADMIN_LIMITS.blackoutNote, "note.long"),
      }),
    )
    .max(ADMIN_LIMITS.blackouts, "blackouts.many"),
});
export type OutletSettingsInput = z.input<typeof outletSettingsInputSchema>;

/* Menu (Blueprint section 10): edits wait as drafts until published; availability is live at once. */

export const menuEditSchema = z.object({
  name: z.string(),
  notes: z.string(),
  /** Paise per serving, in the item's own serving order. */
  prices: z.array(z.number().int().positive()).optional(),
  steepHours: z.number().int().positive().optional(),
  tags: z.array(z.string()),
});
export type MenuEdit = z.infer<typeof menuEditSchema>;

export const menuStateSchema = z.object({
  /** Published edits, by item id, with when and by whom. */
  published: z.record(z.string(), menuEditSchema.extend({ at: instant, by: z.string() })).default({}),
  drafts: z.record(z.string(), menuEditSchema).default({}),
  /** Item ids switched off, per outlet. */
  off: z.partialRecord(z.enum(OUTLET_SLUGS), z.array(z.string())).default({}),
  /** The last mock PDF upload. Null: the file that ships with the site. */
  pdf: z.object({ name: z.string(), bytes: z.number().int(), at: instant, by: z.string() }).nullable().default(null),
});
export type MenuState = z.infer<typeof menuStateSchema>;

const rupees = z
  .string()
  .trim()
  .regex(/^\d{1,5}(\.\d{1,2})?$/, "price.invalid")
  .transform((v) => Math.round(Number(v) * 100))
  .refine((paise) => paise > 0, "price.invalid");

export const menuEditInputSchema = z.object({
  name: z.string().trim().min(1, "name.required").max(ADMIN_LIMITS.itemName, "name.long"),
  notes: z.string().trim().max(ADMIN_LIMITS.itemNotes, "notes.long"),
  /** Rupees as typed, one per serving. */
  prices: z.array(rupees).optional(),
  steepHours: z.coerce
    .number()
    .int("steep.invalid")
    .min(1, "steep.invalid")
    .max(ADMIN_LIMITS.steepMax, "steep.invalid")
    .optional(),
  tags: z.array(z.string()),
});
export type MenuEditInput = z.input<typeof menuEditInputSchema>;

/** What the browser read from the chosen file. Only these facts reach the mock; the file is not kept. */
export const pdfInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  bytes: z.number().int().min(1, "pdf.empty").max(ADMIN_LIMITS.pdfBytes, "pdf.large"),
  /** The file's first bytes: a PDF starts "%PDF-". */
  header: z.string().refine((h) => h.startsWith("%PDF-"), "pdf.type"),
});
export type PdfInput = z.infer<typeof pdfInputSchema>;

/* Bookings, wall and enquiries */

export const bookingDecisionSchema = z.object({
  action: z.enum(["approve", "decline", "seat", "no_show", "note"]),
  note: z.string().trim().max(ADMIN_LIMITS.staffNote, "note.long").optional(),
});
export type BookingDecision = z.input<typeof bookingDecisionSchema>;

export const enquiryUpdateSchema = z.object({
  status: z.enum(["new", "replied", "closed"]),
  note: z.string().trim().max(ADMIN_LIMITS.staffNote, "note.long").optional(),
});
export type EnquiryUpdate = z.input<typeof enquiryUpdateSchema>;
