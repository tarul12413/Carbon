import { describe, expect, it } from "vitest";
import { COMPACT_MAX_WIDTH, canRun3D, type DeviceSignals } from "@/lib/three/capability";

const capable: DeviceSignals = {
  flag: true,
  webgl2: true,
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  viewportWidth: 1440,
};

describe("3D capability gate", () => {
  it("runs on a capable device", () => {
    expect(canRun3D(capable)).toBe(true);
    expect(canRun3D({ ...capable, deviceMemory: undefined })).toBe(true);
  });

  it.each([
    ["the flag is off", { flag: false }],
    ["there is no WebGL2", { webgl2: false }],
    ["reduced motion is asked for", { reducedMotion: true }],
    ["Save-Data is on", { saveData: true }],
    ["the device reports little memory", { deviceMemory: 2 }],
    ["the screen is in the compact band", { viewportWidth: COMPACT_MAX_WIDTH }],
  ])("stays off when %s", (_, change) => {
    expect(canRun3D({ ...capable, ...change })).toBe(false);
  });

  it("starts at the first width above the compact band", () => {
    expect(canRun3D({ ...capable, viewportWidth: COMPACT_MAX_WIDTH + 1 })).toBe(true);
  });
});
