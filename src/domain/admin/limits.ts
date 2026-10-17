/** Admin form limits. Zod-free, so the admin forms can use them without loading the schema. */
export const ADMIN_LIMITS = {
  capacityMax: 200,
  blackouts: 60,
  blackoutNote: 80,
  itemName: 60,
  itemNotes: 200,
  steepMax: 120,
  staffNote: 300,
  /** The mock upload's size cap (10 MB). A technical limit, not a Carbon rule. */
  pdfBytes: 10 * 1024 * 1024,
} as const;
