"use client";

import { useCallback, useSyncExternalStore } from "react";
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

/*
 * The draft is a small store over this tab's sessionStorage. The server and the first (hydrating)
 * render see the empty draft, so the flow can render on the server and hydrate in place (D-061).
 */
let current: Draft | null = null;
const listeners = new Set<() => void>();
const snapshot = () => (current ??= load());
const serverSnapshot = () => emptyDraft;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

function save(next: Draft) {
  current = next;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* Storage blocked: the draft still lives in memory for this visit. */
  }
  for (const listener of listeners) listener();
}

/** The booking in progress, kept in this tab's sessionStorage so a refresh or the back button does not lose it. */
export function useDraft() {
  const draft = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const setDraft = useCallback((next: Draft | ((draft: Draft) => Draft)) => {
    save(typeof next === "function" ? next(snapshot()) : next);
  }, []);
  return [draft, setDraft] as const;
}

export function clearDraft() {
  current = null;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* Nothing saved. */
  }
}
