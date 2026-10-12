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
  | "signature_invalid"
  | "rate_limited"
  | "otp_invalid"
  | "otp_expired"
  | "otp_locked"
  | "session_expired"
  | "token_expired"
  | "too_soon"
  | "card_full"
  | "not_enough_stamps"
  | "pin_invalid"
  | "already_used"
  | "forbidden";

export interface ServiceError {
  readonly code: ServiceErrorCode;
  /** Field → message key, for invalid_input. */
  readonly fields?: Readonly<Record<string, string>>;
  /** Next best slots, for slot_full. */
  readonly alternatives?: readonly { readonly date: string; readonly time: string }[];
  /** Seats still available, for too_many. */
  readonly left?: number;
  /** When to try again, for rate_limited. */
  readonly retryAt?: string;
  /** Code tries left, for otp_invalid. */
  readonly attemptsLeft?: number;
  /** The last stamp and the next allowed one, for too_soon. */
  readonly lastAt?: string;
  readonly nextAt?: string;
}

export type ServiceResult<T> = Result<T, ServiceError>;
