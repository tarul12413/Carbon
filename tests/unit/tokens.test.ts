import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";

const css = readFileSync(resolve(__dirname, "../../src/styles/tokens.css"), "utf8");
const palette = Object.fromEntries(
  [...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, hex]) => [name!, hex!]),
);
const color = (name: string): string => {
  const hex = palette[name];
  if (!hex) throw new Error(`Missing token --color-${name}`);
  return hex;
};

const AA_TEXT = 4.5;
const AA_LARGE_OR_UI = 3;

describe("palette contrast", () => {
  it.each([
    ["bone", "carbon-black"],
    ["bone", "graphite"],
    ["bone", "pewter"],
    ["concrete", "carbon-black"],
    ["concrete", "graphite"],
    ["amber", "carbon-black"],
    ["amber", "graphite"],
    ["carbon-black", "amber"],
    ["leaf", "carbon-black"],
    ["leaf", "graphite"],
    ["ember", "carbon-black"],
    ["ink", "paper"],
    ["ink", "bone"],
    ["concrete-deep", "paper"],
    ["amber-deep", "paper"],
    ["ember-deep", "paper"],
    ["leaf-deep", "paper"],
    ["bone", "amber-deep"],
  ])("%s on %s meets AA for body text", (fg, bg) => {
    expect(contrastRatio(color(fg), color(bg))).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("ember on graphite is large-text and icon only", () => {
    const ratio = contrastRatio(color("ember"), color("graphite"));
    expect(ratio).toBeLessThan(AA_TEXT);
    expect(ratio).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
  });

  it("concrete on pewter fails AA, so secondary text never sits on pewter", () => {
    expect(contrastRatio(color("concrete"), color("pewter"))).toBeLessThan(AA_TEXT);
  });

  it("focus rings reach 3:1 against their page in both themes", () => {
    expect(contrastRatio(color("amber"), color("carbon-black"))).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
    expect(contrastRatio(color("amber-deep"), color("paper"))).toBeGreaterThanOrEqual(AA_LARGE_OR_UI);
  });
});
