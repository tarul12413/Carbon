import { describe, expect, it } from "vitest";
import {
  activeCheckpoint,
  brewLook,
  checkpointsOf,
  clockDigits,
  hourFromProgress,
  joinNames,
  mixColour,
  nextCheckpoint,
  previousCheckpoint,
  progressForHour,
  scrollTargetForHour,
  strikeTilt,
} from "@/domain/steep";

const cps = checkpointsOf([28, 18, 36, 96, 28, 96, 24]);

describe("steep clock maths", () => {
  it("deduplicates and sorts checkpoints", () => {
    expect(cps).toEqual([18, 24, 28, 36, 96]);
  });

  it("maps progress to the nearest whole hour, so pixel rounding cannot miss a checkpoint", () => {
    expect(hourFromProgress(0)).toBe(0);
    expect(hourFromProgress(0.5)).toBe(48);
    expect(hourFromProgress(0.999)).toBe(96);
    expect(hourFromProgress(0.985)).toBe(95);
    expect(hourFromProgress(28 / 96 - 0.001)).toBe(28);
    expect(hourFromProgress(1)).toBe(96);
    expect(hourFromProgress(-1)).toBe(0);
    expect(hourFromProgress(2)).toBe(96);
  });

  it("round-trips checkpoints through progress", () => {
    for (const cp of cps) expect(hourFromProgress(progressForHour(cp))).toBe(cp);
  });

  it("finds the active checkpoint", () => {
    expect(activeCheckpoint(0, cps)).toBeNull();
    expect(activeCheckpoint(17, cps)).toBeNull();
    expect(activeCheckpoint(18, cps)).toBe(18);
    expect(activeCheckpoint(30, cps)).toBe(28);
    expect(activeCheckpoint(96, cps)).toBe(96);
  });

  it("steps forward", () => {
    expect(nextCheckpoint(0, cps)).toBe(18);
    expect(nextCheckpoint(18, cps)).toBe(24);
    expect(nextCheckpoint(30, cps)).toBe(36);
    expect(nextCheckpoint(96, cps)).toBeNull();
  });

  it("steps back from what is showing", () => {
    expect(previousCheckpoint(0, cps)).toBeNull();
    expect(previousCheckpoint(10, cps)).toBe(0);
    expect(previousCheckpoint(18, cps)).toBe(0);
    expect(previousCheckpoint(28, cps)).toBe(24);
    expect(previousCheckpoint(30, cps)).toBe(24);
    expect(previousCheckpoint(96, cps)).toBe(36);
  });

  it("computes the scroll target inside the section", () => {
    expect(scrollTargetForHour(0, 1000, 3000)).toBe(1000);
    expect(scrollTargetForHour(48, 1000, 3000)).toBe(2500);
    expect(scrollTargetForHour(96, 1000, 3000)).toBe(4000);
  });

  it("joins names the way the typed line reads", () => {
    expect(joinNames(["Whiskey Barrel"])).toBe("Whiskey Barrel");
    expect(joinNames(["The Original", "Tropical Monk"])).toBe("The Original and Tropical Monk");
  });

  it("pads digits and keeps tilts small and stable", () => {
    expect(clockDigits(7)).toEqual(["0", "7"]);
    expect(clockDigits(96)).toEqual(["9", "6"]);
    for (let h = 0; h <= 96; h++) {
      const [a, b] = clockDigits(h);
      expect(Math.abs(strikeTilt(a, 0, h))).toBeLessThanOrEqual(4);
      expect(strikeTilt(b, 1, h)).toBe(strikeTilt(b, 1, h));
    }
  });
});

describe("3D glass look", () => {
  it("fills and darkens with the steep, like the SVG glass", () => {
    expect(brewLook(0)).toEqual({ level: 0, darkness: 0, settled: 0 });
    expect(brewLook(1)).toEqual({ level: 1, darkness: 0.9, settled: 1 });
    expect(brewLook(2).level).toBe(1);
    expect(brewLook(-1).level).toBe(0);
  });

  it("settles the grounds after the colour starts to change, and only ever more", () => {
    expect(brewLook(0.15).settled).toBe(0);
    let last = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      const { settled } = brewLook(p);
      expect(settled).toBeGreaterThanOrEqual(last);
      last = settled;
    }
  });

  it("mixes colours channel by channel", () => {
    expect(mixColour("#000000", "#ffffff", 0.5)).toEqual([0.5, 0.5, 0.5]);
    const close = (got: number[], want: number[]) => got.forEach((c, i) => expect(c).toBeCloseTo(want[i]!, 10));
    close(mixColour("#d98e3b", "#2a1a0e", 0), [217 / 255, 142 / 255, 59 / 255]);
    close(mixColour("#d98e3b", "#2a1a0e", 3), [42 / 255, 26 / 255, 14 / 255]);
  });
});
