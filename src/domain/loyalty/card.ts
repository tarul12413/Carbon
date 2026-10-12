import { placeholders } from "@/config/placeholders";
import type { StampEntry } from "./schema";

/**
 * Stamp card rules (Blueprint section 9, "OTP and stamp card rules"). Pure: they read the ledger and
 * a clock, and decide. The engine writes the entries.
 */

export interface CardRules {
  /** Stamps for a reward (P-06). */
  readonly threshold: number;
  /** Minimum gap between two stamps for the same customer (P-17). */
  readonly minGapMinutes: number;
  /** How long a barista can take back a stamp (P-26). */
  readonly undoMinutes: number;
}

export const CARD_RULES: CardRules = {
  threshold: placeholders.stampRewardThreshold.value,
  minGapMinutes: placeholders.stampMinGapMinutes.value,
  undoMinutes: placeholders.stampUndoMinutes.value,
};

const minutes = (n: number) => n * 60_000;

export const entriesFor = (ledger: readonly StampEntry[], customerId: string) =>
  ledger.filter((e) => e.customerId === customerId);

/** The balance is the sum of the ledger. */
export function balance(ledger: readonly StampEntry[], customerId: string): number {
  return entriesFor(ledger, customerId).reduce((sum, e) => sum + e.delta, 0);
}

const undone = (entries: readonly StampEntry[]) => new Set(entries.flatMap((e) => (e.undoes ? [e.undoes] : [])));

/** Visits that still count: not taken back by an undo. */
export function visits(ledger: readonly StampEntry[], customerId: string): StampEntry[] {
  const entries = entriesFor(ledger, customerId);
  const gone = undone(entries);
  return entries.filter((e) => e.reason === "visit" && !gone.has(e.id));
}

export function lastStamp(ledger: readonly StampEntry[], customerId: string): StampEntry | undefined {
  return visits(ledger, customerId).at(-1);
}

export type StampCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: "too_soon"; readonly lastAt: string; readonly nextAt: string }
  | { readonly ok: false; readonly reason: "card_full" };

/**
 * Can this customer get a stamp now? Not within the minimum gap of the last one (a double scan),
 * and not on a full card: it is redeemed first.
 */
export function canStamp(
  ledger: readonly StampEntry[],
  customerId: string,
  now: Date,
  rules: CardRules = CARD_RULES,
): StampCheck {
  if (balance(ledger, customerId) >= rules.threshold) return { ok: false, reason: "card_full" };
  const last = lastStamp(ledger, customerId);
  if (last) {
    const nextAt = Date.parse(last.at) + minutes(rules.minGapMinutes);
    if (now.getTime() < nextAt) {
      return { ok: false, reason: "too_soon", lastAt: last.at, nextAt: new Date(nextAt).toISOString() };
    }
  }
  return { ok: true };
}

/**
 * The stamp that can still be taken back, if any: the customer's latest entry, a visit, within the
 * undo window. Anything after it (a redeem) closes the undo.
 */
export function undoable(
  ledger: readonly StampEntry[],
  customerId: string,
  now: Date,
  rules: CardRules = CARD_RULES,
): { readonly entry: StampEntry; readonly until: string } | null {
  const latest = entriesFor(ledger, customerId).at(-1);
  if (!latest || latest.reason !== "visit") return null;
  const until = Date.parse(latest.at) + minutes(rules.undoMinutes);
  return now.getTime() < until ? { entry: latest, until: new Date(until).toISOString() } : null;
}

export const rewardReady = (stamps: number, rules: CardRules = CARD_RULES) => stamps >= rules.threshold;
