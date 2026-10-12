import { z } from "zod";
import { WALL_LIMITS } from "./limits";

export { WALL_LIMITS, WALL_MIN_FILL_SECONDS } from "./limits";

const instant = z.iso.datetime();

/** Blueprint section 9: wall_entries. A "reader" entry is "I read this too": no text, no approval needed. */
export const wallEntrySchema = z.object({
  id: z.string().regex(/^wal_[a-z0-9]{10}$/),
  kind: z.enum(["book", "reader"]),
  /** Merge key from the title (spine.ts). */
  key: z.string(),
  title: z.string(),
  author: z.string(),
  line: z.string(),
  /** First name or handle, shown only with consent. */
  handle: z.string(),
  showName: z.boolean(),
  status: z.enum(["pending", "approved", "rejected"]),
  source: z.enum(["web", "seed"]),
  createdAt: instant,
});
export type WallEntry = z.infer<typeof wallEntrySchema>;

export const wallReportSchema = z.object({ key: z.string(), at: instant });
export type WallReport = z.infer<typeof wallReportSchema>;

const text = (max: number, required: boolean, name: string) =>
  z
    .string()
    .trim()
    .max(max, `${name}.long`)
    .refine((v) => !required || v.length > 0, `${name}.required`);

export const wallInputSchema = z.object({
  title: text(WALL_LIMITS.title, true, "title"),
  author: text(WALL_LIMITS.author, true, "author"),
  line: text(WALL_LIMITS.line, false, "line"),
  handle: text(WALL_LIMITS.handle, false, "handle"),
  showName: z.boolean(),
  /** Honeypot: hidden from people, must stay empty. */
  website: z.string().max(0, "bot"),
  /** When the form was opened (ms since epoch), for the time trap. */
  openedAt: z.number().int().nonnegative(),
});
export type WallInput = z.input<typeof wallInputSchema>;
