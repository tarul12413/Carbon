"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Whether a screen has been up long enough to take a tap. A fast double tap on the button that
 * opened it otherwise lands its second tap on whatever now sits under the finger.
 */
export function useSettled(ms = 400): (event: { readonly timeStamp: number }) => boolean {
  const shownAt = useRef<number | null>(null);
  useEffect(() => {
    shownAt.current = performance.now();
  }, []);
  return useCallback((event) => shownAt.current !== null && event.timeStamp - shownAt.current >= ms, [ms]);
}
