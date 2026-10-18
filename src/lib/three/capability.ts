/**
 * Whether the 3D layer runs (D-067). The SVG and HTML versions are always rendered; 3D only
 * ever replaces them visually, so saying no here costs nothing but the effect.
 */

/** Below this width the brief's compact band applies: decorative motion off (Blueprint section 6). */
export const COMPACT_MAX_WIDTH = 389;
/** Devices that report less memory than this (GB) skip 3D (Blueprint section 13: low-end phones). */
export const MIN_DEVICE_MEMORY_GB = 4;

export interface DeviceSignals {
  readonly flag: boolean;
  readonly webgl2: boolean;
  readonly reducedMotion: boolean;
  readonly saveData: boolean;
  /** `navigator.deviceMemory`; undefined where the browser does not report it. */
  readonly deviceMemory: number | undefined;
  readonly viewportWidth: number;
}

export function canRun3D(s: DeviceSignals): boolean {
  if (!s.flag || !s.webgl2 || s.reducedMotion || s.saveData) return false;
  if (s.deviceMemory !== undefined && s.deviceMemory < MIN_DEVICE_MEMORY_GB) return false;
  return s.viewportWidth > COMPACT_MAX_WIDTH;
}

interface NavigatorHints {
  readonly deviceMemory?: number;
  readonly connection?: { readonly saveData?: boolean };
}

let webgl2: boolean | undefined;
const hasWebgl2 = () => {
  if (webgl2 === undefined) {
    const gl = document.createElement("canvas").getContext("webgl2");
    webgl2 = gl !== null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  }
  return webgl2;
};

export function readDeviceSignals(flag: boolean): DeviceSignals {
  const hints = navigator as Navigator & NavigatorHints;
  return {
    flag,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: hints.connection?.saveData === true,
    deviceMemory: hints.deviceMemory,
    viewportWidth: window.innerWidth,
    webgl2: flag && hasWebgl2(),
  };
}
