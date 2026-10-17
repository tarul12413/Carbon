import type { OutletSlug } from "@/domain/outlet";
import { staffById, type StaffMember, type StaffRole } from "@/domain/staff";

/**
 * Who sees and does what in the admin (Blueprint section 10). Owners see every outlet; managers and
 * baristas see their own; marketing works across outlets but only on events, the wall and enquiries.
 */

export const ADMIN_SECTIONS = [
  "dashboard",
  "bookings",
  "capacity",
  "menu",
  "events",
  "wall",
  "enquiries",
  "audit",
] as const;
export type AdminSection = (typeof ADMIN_SECTIONS)[number];

const SECTIONS: Readonly<Record<AdminSection, readonly StaffRole[]>> = {
  dashboard: ["owner", "manager", "barista", "marketing"],
  bookings: ["owner", "manager", "barista"],
  capacity: ["owner", "manager"],
  menu: ["owner", "manager"],
  events: ["owner", "manager", "barista", "marketing"],
  wall: ["owner", "marketing"],
  enquiries: ["owner", "marketing"],
  audit: ["owner", "manager"],
};

export const ADMIN_ACTIONS = [
  /** Approve or decline a group request. */
  "booking.decide",
  /** Mark a guest seated or a no-show, on the day. */
  "booking.arrive",
  "booking.note",
  "capacity.edit",
  /** Names, prices, steep hours, notes, tags; publish; the PDF. */
  "menu.edit",
  /** The sold-out switch, live at once. */
  "menu.availability",
  "events.checkIn",
  "wall.moderate",
  "enquiries.update",
] as const;
export type AdminAction = (typeof ADMIN_ACTIONS)[number];

const ACTIONS: Readonly<Record<AdminAction, readonly StaffRole[]>> = {
  "booking.decide": ["owner", "manager"],
  "booking.arrive": ["owner", "manager", "barista"],
  "booking.note": ["owner", "manager"],
  "capacity.edit": ["owner", "manager"],
  "menu.edit": ["owner"],
  "menu.availability": ["owner", "manager"],
  "events.checkIn": ["owner", "manager", "barista"],
  "wall.moderate": ["owner", "marketing"],
  "enquiries.update": ["owner", "marketing"],
};

/** The signed-in admin account. Mock only: Phase 2 takes it from the staff session. */
export interface AdminActor {
  readonly staffId: string;
}

export const adminStaff = (actor: AdminActor): StaffMember | undefined => staffById(actor.staffId);

export const canOpen = (staff: StaffMember, section: AdminSection): boolean => SECTIONS[section].includes(staff.role);

/** An action, optionally at one outlet (the outlet must be one of the account's). */
export function canDo(staff: StaffMember, action: AdminAction, outlet?: OutletSlug): boolean {
  if (!ACTIONS[action].includes(staff.role)) return false;
  return outlet === undefined || staff.outlets.includes(outlet);
}

export const seesOutlet = (staff: StaffMember, outlet: OutletSlug): boolean => staff.outlets.includes(outlet);

export const sectionsFor = (staff: StaffMember): AdminSection[] => ADMIN_SECTIONS.filter((s) => canOpen(staff, s));
