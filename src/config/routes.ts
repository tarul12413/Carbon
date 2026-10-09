import type { OutletSlug } from "./site";

export const routes = {
  home: "/",
  menu: "/menu",
  coldBrew: "/cold-brew",
  outlets: "/outlets",
  outlet: (slug: OutletSlug) => `/outlets/${slug}`,
  book: "/book",
  bookAt: (slug: OutletSlug) => `/book?outlet=${slug}`,
  events: "/events",
  enquire: "/enquire",
  story: "/story",
  bookWall: "/book-wall",
  legal: "/legal/privacy",
  menuItem: (id: string) => `/menu#${id}`,
  steepEnd: "/#steep-96",
} as const;
