import type { Slot } from "@/domain/booking/availability";
import type {
  AvailabilityQuery,
  Booking,
  ChangeInput,
  ConfirmInput,
  HoldInput,
  RequestInput,
} from "@/domain/booking/schema";
import type { Result } from "@/lib/result";

export type BookingErrorCode =
  | "invalid_input"
  | "bot_check"
  | "outside_window"
  | "party_too_large"
  | "slot_full"
  | "not_found"
  | "hold_expired"
  | "not_allowed"
  | "cutoff_passed"
  | "idempotency_conflict";

export interface BookingError {
  readonly code: BookingErrorCode;
  /** Field → message key, for invalid_input. */
  readonly fields?: Readonly<Record<string, string>>;
  /** Next best slots, for slot_full. */
  readonly alternatives?: readonly { readonly date: string; readonly time: string }[];
}

export type BookingResult<T = Booking> = Result<T, BookingError>;

export interface Availability {
  readonly outlet: string;
  readonly date: string;
  readonly partySize: number;
  readonly kind: Booking["kind"];
  readonly slots: readonly Slot[];
}

/**
 * Table bookings. Mirrors the planned endpoints (Blueprint section 9, API surface):
 * GET /api/availability, POST /api/bookings, POST /api/bookings/:code/{confirm,request,cancel,change}.
 * Every write takes an idempotency key.
 */
export interface BookingService {
  getAvailability(query: AvailabilityQuery): Promise<BookingResult<Availability>>;
  createHold(input: HoldInput, idempotencyKey: string): Promise<BookingResult>;
  confirm(code: string, input: ConfirmInput, idempotencyKey: string): Promise<BookingResult>;
  sendRequest(code: string, input: RequestInput, idempotencyKey: string): Promise<BookingResult>;
  change(code: string, input: ChangeInput, idempotencyKey: string): Promise<BookingResult>;
  cancel(code: string, idempotencyKey: string): Promise<BookingResult>;
  getBooking(code: string): Promise<BookingResult>;
}

/** Demo-only controls, shown in the dev panel. Not part of the Phase 2 API. */
export interface DemoControls {
  /** Wipes demo bookings and restores the seed. */
  reset(): Promise<void>;
  /** Ends every live hold now, to show what happens when time runs out. */
  expireHolds(): Promise<number>;
}

export type { Booking };
