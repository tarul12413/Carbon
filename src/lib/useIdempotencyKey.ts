"use client";

import { useCallback, useRef } from "react";
import { fingerprint } from "@/domain/idempotency";
import { randomId } from "./randomId";

/**
 * One idempotency key per distinct request. A double tap or a retry of the same request reuses
 * its key, so the service returns the first result; changing the request gets a new key.
 */
export function useIdempotencyKey(): (request: unknown) => string {
  const keys = useRef(new Map<string, string>());
  return useCallback((request: unknown) => {
    const print = fingerprint(request);
    let key = keys.current.get(print);
    if (!key) {
      key = randomId();
      keys.current.set(print, key);
    }
    return key;
  }, []);
}
