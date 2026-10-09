import type { OutletSlug } from "@/domain/outlet";

/**
 * The booking wizard (Brief: outlet, date and time, party size, details, review and pay choice,
 * confirmation). Step six, the confirmation, is the booking's own page at /book/[code].
 * Large groups see the request form at step five instead of the pay choice (Q-03).
 */

export const FLOW_STEPS = ["outlet", "time", "party", "details", "review"] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];
export const TOTAL_STEPS = FLOW_STEPS.length + 1;

export interface Details {
  readonly name: string;
  readonly phone: string;
  readonly note: string;
  readonly whatsappOptIn: boolean;
  readonly privacyAccepted: boolean;
}

export interface Draft {
  readonly outlet?: OutletSlug;
  readonly date?: string;
  readonly time?: string;
  readonly partySize: number;
  readonly details: Details;
  /** The live hold, once step four is done. */
  readonly code?: string;
}

export const emptyDraft: Draft = {
  partySize: 2,
  details: { name: "", phone: "", note: "", whatsappOptIn: true, privacyAccepted: false },
};

export const isFlowStep = (value: string | null): value is FlowStep =>
  value !== null && (FLOW_STEPS as readonly string[]).includes(value);

export const stepNumber = (step: FlowStep) => FLOW_STEPS.indexOf(step) + 1;

export function previousStep(step: FlowStep): FlowStep | null {
  return FLOW_STEPS[FLOW_STEPS.indexOf(step) - 1] ?? null;
}

/** The furthest step this draft has earned. */
export function furthestStep(draft: Draft): FlowStep {
  if (!draft.outlet) return "outlet";
  if (!draft.date || !draft.time) return "time";
  if (!draft.code) return "details";
  return "review";
}

/** A requested step, pulled back to the furthest one the draft allows. */
export function reachableStep(wanted: FlowStep, draft: Draft): FlowStep {
  const furthest = furthestStep(draft);
  return FLOW_STEPS.indexOf(wanted) <= FLOW_STEPS.indexOf(furthest) ? wanted : furthest;
}

/** Changing where, when or how many invalidates the hold. */
export function updateDraft(draft: Draft, change: Partial<Omit<Draft, "details">>): Draft {
  const next = { ...draft, ...change };
  const slotChanged =
    next.outlet !== draft.outlet ||
    next.date !== draft.date ||
    next.time !== draft.time ||
    next.partySize !== draft.partySize;
  if (next.outlet !== draft.outlet && !("date" in change)) Object.assign(next, { date: undefined, time: undefined });
  else if (next.date !== draft.date && !("time" in change)) Object.assign(next, { time: undefined });
  return slotChanged && !("code" in change) ? { ...next, code: undefined } : next;
}
