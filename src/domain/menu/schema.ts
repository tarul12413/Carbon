import { z } from "zod";

export const priceSchema = z.object({
  label: z.enum(["Hot", "Cold"]).optional(),
  paise: z.number().int().positive(),
});

export const menuItemSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    categoryId: z.string(),
    name: z.string().min(1),
    notes: z.string(),
    /** One price, or one per serving (Hot / Cold). Absent only when priceNote is set. */
    prices: z.array(priceSchema).min(1).optional(),
    /** Printed instead of a price, e.g. "MRP". */
    priceNote: z.string().optional(),
    steepHours: z.number().int().positive().optional(),
    servedHot: z.boolean().optional(),
    tags: z.array(z.string()),
    available: z.boolean(),
  })
  .refine((item) => Boolean(item.prices) !== Boolean(item.priceNote), {
    message: "An item has either prices or a priceNote, not both",
  });

export const menuCategorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string(),
  page: z.number().int().positive(),
  kind: z.enum(["drinks", "food", "add-ons"]),
  /** Printed heading that groups several sections, e.g. "Between the Breads". */
  group: z.string().optional(),
  /** Printed under the section title, e.g. "*Upgrade beans @50.00". */
  note: z.string().optional(),
});

export const menuSeedSchema = z
  .object({
    source: z.string(),
    transcription: z.object({
      status: z.enum(["partial", "complete"]),
      pagesDone: z.array(z.number().int()),
      note: z.string(),
    }),
    categories: z.array(menuCategorySchema),
    items: z.array(menuItemSchema),
  })
  .superRefine((seed, ctx) => {
    const categoryIds = new Set(seed.categories.map((c) => c.id));
    const itemIds = new Set<string>();
    seed.items.forEach((item, index) => {
      if (!categoryIds.has(item.categoryId)) {
        ctx.addIssue({
          code: "custom",
          path: ["items", index, "categoryId"],
          message: `Unknown category ${item.categoryId}`,
        });
      }
      if (itemIds.has(item.id)) {
        ctx.addIssue({ code: "custom", path: ["items", index, "id"], message: `Duplicate id ${item.id}` });
      }
      itemIds.add(item.id);
    });
  });

export type Price = z.infer<typeof priceSchema>;
export type MenuItem = z.infer<typeof menuItemSchema>;
export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type MenuSeed = z.infer<typeof menuSeedSchema>;

export interface Menu {
  readonly categories: readonly MenuCategory[];
  readonly items: readonly MenuItem[];
}
