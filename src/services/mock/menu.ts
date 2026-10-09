import seed from "../../../data/menu.json";
import documentSeed from "../../../data/menu-document.json";
import { HOUSE_NAMED_TAG, signatures } from "@/domain/menu/browse";
import { menuSeedSchema, type MenuItem } from "@/domain/menu/schema";
import type { ColdBrew, MenuService } from "../menu";

const menu = menuSeedSchema.parse(seed);

const isColdBrew = (item: MenuItem): item is ColdBrew =>
  item.categoryId === "signature-cold-brews" && item.steepHours !== undefined;

export const mockMenuService: MenuService = {
  async getMenu() {
    return { categories: menu.categories, items: menu.items };
  },
  async listColdBrews() {
    return menu.items.filter(isColdBrew).sort((a, b) => a.steepHours - b.steepHours);
  },
  async listSignatures() {
    return signatures(menu.items);
  },
  async listHouseSignatures() {
    return menu.items.filter((item) => item.tags.includes(HOUSE_NAMED_TAG));
  },
  async getMenuDocument() {
    return documentSeed;
  },
};
