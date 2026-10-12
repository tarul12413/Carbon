import { OUTLET_SLUGS, type OutletSlug } from "./outlet";

/**
 * Staff roles (Blueprint section 10). The demo signs staff in by picking one of these sample
 * accounts; Phase 2 uses a magic link or Google sign-in on registered devices.
 */
export const STAFF_ROLES = ["owner", "manager", "barista", "marketing"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export interface StaffMember {
  readonly id: string;
  readonly role: StaffRole;
  /** Outlets this account works at. Owners see every outlet. */
  readonly outlets: readonly OutletSlug[];
}

const at = (outlet: OutletSlug) => [outlet] as const;

/** Sample accounts, one per role and outlet. Fictional: no real names. */
export const SAMPLE_STAFF: readonly StaffMember[] = [
  { id: "stf-owner", role: "owner", outlets: OUTLET_SLUGS },
  ...OUTLET_SLUGS.map((o): StaffMember => ({ id: `stf-manager-${o}`, role: "manager", outlets: at(o) })),
  ...OUTLET_SLUGS.map((o): StaffMember => ({ id: `stf-barista-${o}`, role: "barista", outlets: at(o) })),
  { id: "stf-marketing", role: "marketing", outlets: OUTLET_SLUGS },
];

export const staffById = (id: string | null | undefined): StaffMember | undefined =>
  SAMPLE_STAFF.find((s) => s.id === id);

/** What each role may do at the counter and the door (Blueprint section 10). */
const CAN: Readonly<Record<"stamp" | "checkIn", readonly StaffRole[]>> = {
  stamp: ["owner", "barista"],
  checkIn: ["owner", "manager", "barista"],
};

export function staffCan(staff: StaffMember, action: keyof typeof CAN, outlet: OutletSlug): boolean {
  return CAN[action].includes(staff.role) && staff.outlets.includes(outlet);
}

/** Who did what, for the audit log (Blueprint: every change is logged with staff name). */
export interface StaffActor {
  readonly staffId: string;
  /** The outlet this device is at. */
  readonly outlet: OutletSlug;
}
