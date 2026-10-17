"use client";

import { useMemo, useSyncExternalStore } from "react";
import { applyOverlay, type MenuOverlay } from "@/domain/menu/overlay";
import type { Menu } from "@/domain/menu/schema";
import { isOutletSlug } from "@/domain/outlet";
import { BROWSER_DB_KEY } from "@/services/mock/storageKey";

/*
 * Demo only (D-026): admin edits live in this browser, so the public menu reads them from here.
 * Phase 2 publishes to the database and revalidates the page; this hook goes away.
 */

let cached: string | null | undefined;
const read = () => {
  try {
    return window.localStorage.getItem(BROWSER_DB_KEY);
  } catch {
    return null;
  }
};
const subscribe = (onChange: () => void) => {
  /* Fresh on every visit: admin may have changed things in this tab since. */
  cached = read();
  const onStorage = (e: StorageEvent) => {
    if (e.key !== BROWSER_DB_KEY) return;
    cached = read();
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};
const snapshot = () => {
  if (cached === undefined) cached = read();
  return cached;
};

function parse(saved: string | null): MenuOverlay | null {
  if (!saved) return null;
  try {
    const menu = (JSON.parse(saved) as { menu?: Partial<MenuOverlay> }).menu;
    if (!menu || typeof menu.published !== "object" || typeof menu.off !== "object") return null;
    const edited = Object.keys(menu.published).length > 0 || Object.values(menu.off).some((ids) => ids?.length);
    return edited ? { published: menu.published, off: menu.off } : null;
  } catch {
    return null;
  }
}

/** The menu with this browser's published edits and sold-out switches, at the QR's outlet if any. */
export function useMenuOverlay(menu: Menu): Menu {
  const saved = useSyncExternalStore(subscribe, snapshot, () => null);
  return useMemo(() => {
    const overlay = parse(saved);
    if (!overlay) return menu;
    const outlet = new URLSearchParams(window.location.search).get("outlet");
    return applyOverlay(menu, overlay, isOutletSlug(outlet) ? outlet : null);
  }, [menu, saved]);
}
