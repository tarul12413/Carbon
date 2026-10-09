"use client";

import { useEffect, useState } from "react";
import { emptyDraft, type Draft } from "@/domain/booking/flow";
import { isOutletSlug } from "@/domain/outlet";

const KEY = "carbon-demo:booking-draft";

function load(): Draft {
  try {
    const saved = window.sessionStorage.getItem(KEY);
    if (!saved) return emptyDraft;
    const draft = JSON.parse(saved) as Draft;
    const outletOk = draft.outlet === undefined || isOutletSlug(draft.outlet);
    return outletOk && typeof draft.partySize === "number" && draft.details ? draft : emptyDraft;
  } catch {
    return emptyDraft;
  }
}

/**
 * The booking in progress, kept in this tab's sessionStorage so a refresh or the back button
 * does not lose it. Only call this from a component that renders on the client only.
 */
export function useDraft(initial: (saved: Draft) => Draft) {
  const [draft, setDraft] = useState<Draft>(() => initial(load()));
  useEffect(() => {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      /* Storage blocked: the draft still lives in memory for this visit. */
    }
  }, [draft]);
  return [draft, setDraft] as const;
}

export function clearDraft() {
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* Nothing saved. */
  }
}
