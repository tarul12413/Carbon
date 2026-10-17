import { describe, expect, it } from "vitest";
import seed from "../../data/menu.json";
import { browseMenu, elementSymbols, formatPrices, matchesQuery, signatures } from "@/domain/menu/browse";
import { menuSeedSchema } from "@/domain/menu/schema";

const menu = menuSeedSchema.parse(seed);
const count = (sections: ReturnType<typeof browseMenu>) => sections.reduce((n, s) => n + s.items.length, 0);

describe("menu browsing", () => {
  it("shows everything with no query or filter, in printed section order", () => {
    const sections = browseMenu(menu, "", "all");
    expect(count(sections)).toBe(166);
    expect(sections[0]?.category.id).toBe("signature-cold-brews");
  });

  it("searches names, notes and section names, ignoring case and accents", () => {
    expect(count(browseMenu(menu, "MATCHA", "all"))).toBe(6);
    expect(count(browseMenu(menu, "creme", "all"))).toBeGreaterThan(0);
    expect(count(browseMenu(menu, "between the breads", "all"))).toBe(10);
    expect(count(browseMenu(menu, "zzz", "all"))).toBe(0);
  });

  it("needs every word to match", () => {
    const item = menu.items.find((i) => i.id === "carbon-toddy")!;
    expect(matchesQuery(item, undefined, "toddy cardamom")).toBe(true);
    expect(matchesQuery(item, undefined, "toddy pizza")).toBe(false);
  });

  it("filters drinks, food, cold brew and signatures", () => {
    const drinks = count(browseMenu(menu, "", "drinks"));
    const food = count(browseMenu(menu, "", "food"));
    const addOns = menu.items.filter((i) => i.categoryId.endsWith("add-ons")).length;
    expect(drinks + food + addOns).toBe(166);
    expect(count(browseMenu(menu, "", "cold-brew"))).toBe(7);
    expect(count(browseMenu(menu, "", "signatures"))).toBe(11);
    expect(count(browseMenu(menu, "honey", "cold-brew"))).toBe(2);
  });

  it("orders signatures: cold brews by steep, then house-named drinks", () => {
    const names = signatures(menu.items).map((i) => i.name);
    expect(names.slice(0, 2)).toEqual(["Whiskey Barrel", "Mango Passion"]);
    expect(names.at(-1)).toBe("Pink Carbon");
  });

  it("derives unique two-letter element symbols from menu names", () => {
    const names = signatures(menu.items).map((i) => i.name);
    const symbols = elementSymbols(names);
    expect(new Set(symbols).size).toBe(symbols.length);
    expect(symbols.slice(0, 3)).toEqual(["Wb", "Mp", "Or"]);
    expect(elementSymbols(["Mint Lime", "Mango Lassi"])).toEqual(["Ml", "Ma"]);
  });

  it("formats prices the way the menu prints them, in rupees", () => {
    expect(formatPrices({ prices: [{ paise: 29000 }] })).toBe("Rs 290");
    expect(
      formatPrices({
        prices: [
          { label: "Hot", paise: 22000 },
          { label: "Cold", paise: 24000 },
        ],
      }),
    ).toBe("Hot Rs 220 · Cold Rs 240");
    expect(formatPrices({ priceNote: "MRP" })).toBe("MRP");
  });
});
