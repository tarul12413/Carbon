"use client";

import { useMemo, useSyncExternalStore } from "react";

const CHANGED = "carbon:search-changed";

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
};

/**
 * The URL's query, read without useSearchParams: on a static page that hook makes the component
 * render on the client only. Here the server and the hydrating render see an empty query, and the
 * real one arrives straight after. Changes go through pushSearch / replaceSearch (or Back).
 */
export function useLocationSearch(): URLSearchParams {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => "",
  );
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function pushSearch(search: string) {
  window.history.pushState(null, "", search);
  window.dispatchEvent(new Event(CHANGED));
}

export function replaceSearch(search: string) {
  window.history.replaceState(null, "", search);
  window.dispatchEvent(new Event(CHANGED));
}
