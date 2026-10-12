/**
 * A first filter for the book wall (Blueprint section 9). It catches the obvious words in English and
 * Hinglish, including common letter swaps; staff approval catches the rest. Phase 2 replaces the list
 * with a maintained one.
 */

/** Matched inside words too ("f*ck" variants, compounds). */
const ROOTS = ["fuck", "madarchod", "behenchod", "bhenchod", "bhosd", "chutiy"];
/** Whole words only, so "Scunthorpe" passes. Words that appear in real titles ("Moby Dick") are left to staff. */
const WORDS = ["cunt", "shit", "bitch", "asshole", "slut", "whore", "gandu", "randi"];

const SWAPS: Readonly<Record<string, string>> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
  "*": "u",
};

function flatten(text: string): string {
  return [...text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()].map((c) => SWAPS[c] ?? c).join("");
}

export function hasProfanity(...texts: readonly string[]): boolean {
  return texts.some((text) => {
    const flat = flatten(text);
    const squeezed = flat.replace(/[^a-z]/g, "");
    if (ROOTS.some((root) => squeezed.includes(root))) return true;
    const words = flat.split(/[^a-z]+/);
    return words.some((w) => WORDS.includes(w) || WORDS.includes(w.replace(/s$/, "")));
  });
}
