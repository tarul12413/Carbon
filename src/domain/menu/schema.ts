import { z } from "zod";

export const menuItemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  categoryId: z.string(),
  name: z.string().min(1),
  notes: z.string(),
  pricePaise: z.number().int().positive(),
  steepHours: z.number().int().positive().optional(),
  servedHot: z.boolean().optional(),
  tags: z.array(z.string()),
  available: z.boolean(),
});

export const menuCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  page: z.number().int().positive(),
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

export type MenuItem = z.infer<typeof menuItemSchema>;
export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type MenuSeed = z.infer<typeof menuSeedSchema>;
