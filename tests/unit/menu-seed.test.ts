import { describe, expect, it } from "vitest";
import seed from "../../data/menu.json";
import { menuSeedSchema } from "@/domain/menu/schema";
import { mockMenuService } from "@/services/mock/menu";

describe("menu seed", () => {
  it("matches the schema", () => {
    expect(() => menuSeedSchema.parse(seed)).not.toThrow();
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

  it("stores money as whole paise", () => {
    for (const item of seed.items) expect(Number.isInteger(item.pricePaise)).toBe(true);
  });
});
