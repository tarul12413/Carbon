import type { Slot } from "@/domain/booking/availability";
import type {
  AvailabilityQuery,
  Booking,
  ChangeInput,
  ConfirmInput,
  HoldInput,
  RequestInput,
} from "@/domain/booking/schema";
import type { ServiceResult } from "./errors";

export type BookingResult<T = Booking> = ServiceResult<T>;

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

export type { Booking };
