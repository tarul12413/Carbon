/**
 * Book wall spines are drawn from the title (Blueprint 5.6): colour, height and thickness come from a
 * hash, so there are no cover images to license and the same book always looks the same.
 */

/** Merge key: case, accents, punctuation, spacing and a leading "The", "A" or "An" do not matter. */
export function titleKey(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/^(the|a|an) /, "");
}

/** FNV-1a, 32-bit: small, fast, and stable across browsers and the server. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (const ch of text) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export const SPINE_COLOURS = 6;

export interface SpineShape {
  /** Index into the spine palette (tokens --spine-0 to --spine-5). */
  readonly colour: number;
  /** Share of the shelf height, 0.62 to 1. */
  readonly height: number;
  /** Thickness in rem, 2.25 to 3.5. */
  readonly width: number;
  /** Degrees the spine is tilted while it slides onto the shelf, -6 to 6. */
  readonly tilt: number;
}

export function spineShape(key: string): SpineShape {
  const h = hash(key);
  return {
    colour: h % SPINE_COLOURS,
    height: 0.62 + ((h >>> 3) % 39) / 100,
    width: 2.25 + ((h >>> 9) % 6) * 0.25,
    tilt: ((h >>> 14) % 13) - 6,
  };
}
