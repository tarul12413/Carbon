import type { Menu, MenuCategory, MenuItem, Price } from "./schema";

/** Drinks that carry Carbon's name (OPEN_QUESTIONS Q-10). */
export const HOUSE_NAMED_TAG = "house-named";
export const COLD_BREW_TAG = "cold-brew";

export type MenuFilter = "all" | "drinks" | "food" | "cold-brew" | "signatures";

export const isSignature = (item: MenuItem) => item.tags.includes(COLD_BREW_TAG) || item.tags.includes(HOUSE_NAMED_TAG);

/** Signatures in display order: cold brews by steep time, then the house-named drinks in menu order. */
export function signatures(items: readonly MenuItem[]): MenuItem[] {
  const brews = items
    .filter((i) => i.tags.includes(COLD_BREW_TAG))
    .sort((a, b) => (a.steepHours ?? 0) - (b.steepHours ?? 0));
  const named = items.filter((i) => i.tags.includes(HOUSE_NAMED_TAG));
  return [...brews, ...named];
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Every search word must appear in the item's name, notes or section name. */
export function matchesQuery(item: MenuItem, category: MenuCategory | undefined, query: string): boolean {
  const words = normalise(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalise(`${item.name} ${item.notes} ${category?.name ?? ""} ${category?.group ?? ""}`);
  return words.every((word) => haystack.includes(word));
}

export function matchesFilter(item: MenuItem, category: MenuCategory | undefined, filter: MenuFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "drinks":
      return category?.kind === "drinks";
    case "food":
      return category?.kind === "food";
    case "cold-brew":
      return item.tags.includes(COLD_BREW_TAG);
    case "signatures":
      return isSignature(item);
  }
}

export interface MenuSection {
  readonly category: MenuCategory;
  readonly items: readonly MenuItem[];
}

/** Sections in printed order, each with the items that pass the query and filter. Empty sections are dropped. */
export function browseMenu(menu: Menu, query: string, filter: MenuFilter): MenuSection[] {
  const byId = new Map(menu.categories.map((c) => [c.id, c]));
  return menu.categories
    .map((category) => ({
      category,
      items: menu.items.filter(
        (item) =>
          item.categoryId === category.id &&
          matchesFilter(item, byId.get(item.categoryId), filter) &&
          matchesQuery(item, byId.get(item.categoryId), query),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

const STOP_WORDS = new Set(["the", "and", "&", "of"]);

/**
 * Two-letter element symbol for the periodic view, derived from the menu name:
 * first letters of the first two significant words ("Whiskey Barrel" → "Wb"),
 * or the first two letters of a single word ("The Original" → "Or").
 * Later collisions take the next unused letter of the last word.
 */
export function elementSymbols(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    const words = name.split(/\s+/).filter((w) => !STOP_WORDS.has(w.toLowerCase()));
    const first = words[0] ?? name;
    const last = words.at(-1) ?? name;
    const candidates =
      words.length > 1
        ? [`${first[0]}${words[1]![0]}`, ...[...last.slice(1)].map((c) => `${first[0]}${c}`)]
        : [...first.slice(1)].map((c) => `${first[0]}${c}`);
    const symbol =
      candidates.map((c) => `${c[0]!.toUpperCase()}${c.slice(1).toLowerCase()}`).find((c) => !used.has(c)) ??
      first.slice(0, 2);
    used.add(symbol);
    return symbol;
  });
}

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** 29000 → "₹290". */
export const formatPaise = (paise: number) => rupees.format(paise / 100);

/** "₹290", "Hot ₹220 · Cold ₹240", or the printed note ("MRP"). */
export function formatPrices(item: Pick<MenuItem, "prices" | "priceNote">): string {
  if (!item.prices) return item.priceNote ?? "";
  return item.prices
    .map((p: Price) => (p.label ? `${p.label} ${rupees.format(p.paise / 100)}` : rupees.format(p.paise / 100)))
    .join(" · ");
}

export interface MenuElement {
  readonly item: MenuItem;
  readonly symbol: string;
  /** Position in the table, 1-based. */
  readonly number: number;
}

/** The periodic view: signatures only, each with its derived symbol. */
export function periodicElements(items: readonly MenuItem[]): MenuElement[] {
  const ordered = signatures(items);
  const symbols = elementSymbols(ordered.map((i) => i.name));
  return ordered.map((item, index) => ({ item, symbol: symbols[index] ?? "", number: index + 1 }));
}
