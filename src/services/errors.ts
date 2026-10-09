import type { Result } from "@/lib/result";

/** Error codes shared by every mock service and route handler. */
export type ServiceErrorCode =
  | "invalid_input"
  | "bot_check"
  | "outside_window"
  | "party_too_large"
  | "slot_full"
  | "not_found"
  | "hold_expired"
  | "not_allowed"
  | "cutoff_passed"
  | "idempotency_conflict"
  | "sold_out"
  | "too_many"
  | "signature_invalid";

export interface ServiceError {
  readonly code: ServiceErrorCode;
  /** Field → message key, for invalid_input. */
  readonly fields?: Readonly<Record<string, string>>;
  /** Next best slots, for slot_full. */
  readonly alternatives?: readonly { readonly date: string; readonly time: string }[];
  /** Seats still available, for too_many. */
  readonly left?: number;
}

export type ServiceResult<T> = Result<T, ServiceError>;
