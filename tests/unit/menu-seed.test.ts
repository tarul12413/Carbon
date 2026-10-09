import { describe, expect, it } from "vitest";
import seed from "../../data/menu.json";
import { menuSeedSchema } from "@/domain/menu/schema";
import { mockMenuService } from "@/services/mock/menu";

const menu = menuSeedSchema.parse(seed);

describe("menu seed", () => {
  it("matches the schema and is a complete transcription", () => {
    expect(menu.transcription.status).toBe("complete");
    expect(menu.categories).toHaveLength(27);
    expect(menu.items).toHaveLength(166);
  });

  it("has the seven signature cold brews at the steep times printed on page 3", async () => {
    const brews = await mockMenuService.listColdBrews();
    expect(brews.map((b) => [b.steepHours, b.name])).toEqual([
      [18, "Whiskey Barrel"],
      [24, "Mango Passion"],
      [28, "The Original"],
      [28, "Tropical Monk"],
      [36, "Mint Lime"],
      [96, "Vanilla Orange"],
      [96, "Berry Bold"],
    ]);
  });

  it("finds every drink that carries the Carbon name", async () => {
    const named = await mockMenuService.listHouseSignatures();
    expect(named.map((i) => i.name)).toEqual([
      "Black Carbon Latte",
      "Carbon Ginger Brew",
      "Carbon Toddy",
      "Pink Carbon",
    ]);
    const carbonInName = menu.items.filter((i) => /carbon/i.test(i.name)).map((i) => i.name);
    expect(carbonInName.sort()).toEqual(named.map((i) => i.name).sort());
  });

  it("stores money as whole paise and keeps hot and cold prices apart", () => {
    for (const item of menu.items) {
      for (const price of item.prices ?? []) expect(Number.isInteger(price.paise)).toBe(true);
    }
    const ceraFilter = menu.items.find((i) => i.id === "cera-filter");
    expect(ceraFilter?.prices).toEqual([
      { label: "Hot", paise: 22000 },
      { label: "Cold", paise: 24000 },
    ]);
    expect(menu.items.find((i) => i.id === "packaged-drinking-water")?.priceNote).toBe("MRP");
  });

  it("makes no dietary or caffeine claims the menu does not print", () => {
    const tags = new Set(menu.items.flatMap((i) => i.tags));
    expect([...tags].sort()).toEqual(["cold-brew", "house-named"]);
  });

  it("points at a downloadable PDF", async () => {
    const doc = await mockMenuService.getMenuDocument();
    expect(doc.href).toMatch(/^\/menu\/.+\.pdf$/);
    expect(doc.edition).toBe("March 2026");
  });
});
