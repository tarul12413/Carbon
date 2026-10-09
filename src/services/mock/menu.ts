import seed from "../../../data/menu.json";
import { menuSeedSchema, type MenuItem } from "@/domain/menu/schema";
import type { ColdBrew, MenuService } from "../menu";

const menu = menuSeedSchema.parse(seed);

const isColdBrew = (item: MenuItem): item is ColdBrew =>
  item.categoryId === "signature-cold-brews" && item.steepHours !== undefined;

export const mockMenuService: MenuService = {
  async listColdBrews() {
    return menu.items.filter(isColdBrew).sort((a, b) => a.steepHours - b.steepHours);
  },
  async listHouseSignatures() {
    return menu.items.filter((item) => item.tags.includes("house-named"));
  },
};
