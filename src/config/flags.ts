/**
 * Feature flags. Read from public env vars so a Vercel preview can switch them
 * without a code change. Defaults follow the locked decisions in docs/BRIEF.md.
 */

const flag = (value: string | undefined, fallback: boolean): boolean => {
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
};

export const flags = {
  stampCard: flag(process.env.NEXT_PUBLIC_FLAG_STAMP_CARD, false),
  devPanel: flag(process.env.NEXT_PUBLIC_FLAG_DEV_PANEL, true),
} as const;

export type FlagName = keyof typeof flags;
