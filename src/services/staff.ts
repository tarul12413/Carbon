import type { Order, Ticket } from "@/domain/orders/schema";
import type { StaffActor } from "@/domain/staff";
import type { ServiceResult } from "./errors";

/** A customer's card as the barista sees it (wireframe 11, screen 2). */
export interface StaffCardView {
  readonly customerId: string;
  readonly name?: string;
  readonly phoneMasked: string;
  readonly stamps: number;
  readonly threshold: number;
  readonly rewardReady: boolean;
  readonly lastStampAt: string | null;
  /** When a stamp may next be added (minimum gap), if not now. */
  readonly nextStampAt: string | null;
  /** The stamp that can still be taken back, and until when. */
  readonly undo: { readonly entryId: string; readonly until: string } | null;
}

export type CardLookup = { readonly token: string } | { readonly phone: string };

/** A ticket as the door sees it. */
export interface DoorView {
  readonly ticket: Ticket;
  readonly order: Order;
  /** Paid online or at the counter. A pay-at-cafe ticket is collected before check-in. */
  readonly paid: boolean;
}

export type TicketLookup = { readonly token: string } | { readonly code: string };

/**
 * The staff scanner (Blueprint 5.7 and section 9: POST /api/staff/stamps and /staff/redeem, plus
 * ticket check-in at the door). Every write is logged with the staff account and outlet.
 */
export interface StaffService {
  findCard(staff: StaffActor, lookup: CardLookup): Promise<ServiceResult<StaffCardView>>;
  addStamp(staff: StaffActor, customerId: string, idempotencyKey: string): Promise<ServiceResult<StaffCardView>>;
  undoStamp(staff: StaffActor, entryId: string, idempotencyKey: string): Promise<ServiceResult<StaffCardView>>;
  redeem(
    staff: StaffActor,
    customerId: string,
    pin: string,
    idempotencyKey: string,
  ): Promise<ServiceResult<StaffCardView>>;
  findTicket(staff: StaffActor, lookup: TicketLookup): Promise<ServiceResult<DoorView>>;
  /** Marks the ticket used, once. `collected`: a pay-at-cafe ticket was paid at the door first. */
  checkIn(
    staff: StaffActor,
    code: string,
    collected: boolean,
    idempotencyKey: string,
  ): Promise<ServiceResult<DoorView>>;
}
