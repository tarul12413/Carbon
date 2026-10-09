"use client";

import { useCallback, useSyncExternalStore } from "react";

/** The current time, refreshed every `intervalMs`. Null during server render. */
export function useNow(intervalMs: number): Date | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const id = window.setInterval(onChange, intervalMs);
      return () => window.clearInterval(id);
    },
    [intervalMs],
  );
  const tick = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / intervalMs),
    () => null,
  );
  return tick === null ? null : new Date(tick * intervalMs);
}
