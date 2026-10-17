import type { MenuEdit } from "@/domain/admin/schema";
import { OUTLET_SLUGS, type OutletSlug } from "@/domain/outlet";
import type { Menu, MenuItem } from "./schema";

/**
 * Admin's published edits and sold-out switches laid over the transcribed menu. Zod-free, so the
 * public menu can apply them without loading the mock backend.
 */
export interface MenuOverlay {
  readonly published: Readonly<Record<string, MenuEdit>>;
  readonly off: Readonly<Partial<Record<OutletSlug, readonly string[]>>>;
}

export function applyEdit(item: MenuItem, edit: MenuEdit | undefined): MenuItem {
  if (!edit) return item;
  const prices = edit.prices;
  return {
    ...item,
    name: edit.name,
    notes: edit.notes,
    tags: [...edit.tags],
    ...(item.prices && prices ? { prices: item.prices.map((p, i) => ({ ...p, paise: prices[i] ?? p.paise })) } : {}),
    ...(item.steepHours !== undefined && edit.steepHours !== undefined ? { steepHours: edit.steepHours } : {}),
  };
}

/** Switched off at this outlet; with no outlet known, switched off everywhere. */
export function isOff(off: MenuOverlay["off"], itemId: string, outlet: OutletSlug | null): boolean {
  if (outlet) return off[outlet]?.includes(itemId) ?? false;
  return OUTLET_SLUGS.every((o) => off[o]?.includes(itemId));
}

export function applyOverlay(menu: Menu, overlay: MenuOverlay, outlet: OutletSlug | null): Menu {
  return {
    categories: menu.categories,
    items: menu.items.map((item) => {
      const edited = applyEdit(item, overlay.published[item.id]);
      return isOff(overlay.off, item.id, outlet) ? { ...edited, available: false } : edited;
    }),
  };
}
