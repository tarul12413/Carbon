import { z } from "zod";
import { OUTLET_SLUGS } from "@/domain/outlet";

export const AUDIT_ACTIONS = [
  "stamp.add",
  "stamp.undo",
  "reward.redeem",
  "redeem.pin_wrong",
  "ticket.check_in",
  "ticket.paid_at_door",
  "order.paid_at_counter",
  "booking.approve",
  "booking.decline",
  "booking.seat",
  "booking.no_show",
  "booking.note",
  "settings.update",
  "menu.publish",
  "menu.available",
  "menu.unavailable",
  "menu.pdf",
  "wall.approve",
  "wall.reject",
  "wall.hide",
  "wall.keep",
  "enquiry.update",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Blueprint section 9: audit_log (actor, action, entity, diff, at). Every staff change lands here. */
export const auditEntrySchema = z.object({
  at: z.iso.datetime(),
  staffId: z.string(),
  /** Absent for changes that are not tied to one outlet (the wall, enquiries, the menu text). */
  outlet: z.enum(OUTLET_SLUGS).optional(),
  action: z.enum(AUDIT_ACTIONS),
  entity: z.string(),
  /** What changed, in a few words ("capacity 24 → 30"). */
  detail: z.string().optional(),
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;
