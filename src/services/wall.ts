import type { WallInput } from "@/domain/wall/schema";
import type { ServiceResult } from "./errors";

export interface SpineLine {
  readonly line: string;
  /** First name or handle, only if the reader agreed to show it. */
  readonly name?: string;
}

/** One book on the shelf: every approved entry with the same title, merged. */
export interface Spine {
  readonly key: string;
  readonly title: string;
  readonly author: string;
  readonly readers: number;
  readonly lines: readonly SpineLine[];
}

export interface Shelf {
  readonly spines: readonly Spine[];
  readonly readers: number;
  /** Entries waiting for staff. */
  readonly waiting: number;
}

/** What the reader sees after sending: it waits for staff. */
export interface WallReceipt {
  readonly id: string;
  readonly status: "pending" | "approved";
}

/**
 * The book wall (Blueprint 5.6 and section 9: POST /api/wall). Public, with a bot check, length
 * limits, a profanity filter and a rate limit; staff approve before anything shows.
 */
export interface WallService {
  getShelf(): Promise<ServiceResult<Shelf>>;
  submit(input: WallInput, idempotencyKey: string): Promise<ServiceResult<WallReceipt>>;
  /** "I read this too": one more reader on an approved spine. No text, so no approval needed. */
  addReader(key: string, idempotencyKey: string): Promise<ServiceResult<Spine>>;
  report(key: string, idempotencyKey: string): Promise<ServiceResult<null>>;
}
