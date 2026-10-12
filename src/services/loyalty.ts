import type { OtpRequestInput, OtpVerifyInput, StampEntry } from "@/domain/loyalty/schema";
import type { ServiceResult } from "./errors";

export interface OtpChallengeView {
  readonly challengeId: string;
  /** "+91 ••••• •3210". */
  readonly phoneMasked: string;
  readonly expiresAt: string;
  /** Earliest time a new code can be sent. */
  readonly resendAt: string;
  /**
   * Mock only: the code the SMS would carry, shown in a dev toast. Phase 2 sends it by SMS and
   * this field does not exist.
   */
  readonly demoCode?: string;
}

export interface CardHistoryItem {
  readonly at: string;
  readonly reason: StampEntry["reason"];
  readonly delta: number;
  readonly outlet: StampEntry["outlet"];
}

export interface StampCard {
  readonly phoneMasked: string;
  readonly name?: string;
  readonly stamps: number;
  readonly threshold: number;
  readonly rewardReady: boolean;
  readonly rewardsRedeemed: number;
  /** Newest first. */
  readonly history: readonly CardHistoryItem[];
}

export interface SignedIn {
  /** Session id. Phase 2 keeps it in a secure, HTTP-only cookie. */
  readonly session: string;
  readonly card: StampCard;
}

export interface StampQr {
  readonly token: string;
  readonly expiresAt: string;
}

/**
 * The customer side of the stamp card (Blueprint section 9: POST /api/auth/otp/request and
 * /verify; GET /api/me, /me/stamps, /me/qr). Behind the stampCard feature flag.
 */
export interface LoyaltyService {
  requestOtp(input: OtpRequestInput, idempotencyKey: string): Promise<ServiceResult<OtpChallengeView>>;
  verifyOtp(input: OtpVerifyInput, idempotencyKey: string): Promise<ServiceResult<SignedIn>>;
  getCard(session: string): Promise<ServiceResult<StampCard>>;
  /** A fresh QR token, valid for 60 seconds. */
  getQr(session: string): Promise<ServiceResult<StampQr>>;
  signOut(session: string): Promise<ServiceResult<null>>;
  /** Self-service deletion: the card, its history and every session go. */
  deleteCard(session: string): Promise<ServiceResult<null>>;
}
