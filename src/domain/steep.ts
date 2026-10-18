/** Pure maths for the steep clock: scroll progress ⇄ hours ⇄ checkpoints. */

export const MAX_STEEP_HOURS = 96;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function hourFromProgress(progress: number): number {
  return Math.round(clamp(progress, 0, 1) * MAX_STEEP_HOURS);
}

export function progressForHour(hour: number): number {
  return clamp(hour, 0, MAX_STEEP_HOURS) / MAX_STEEP_HOURS;
}

export function checkpointsOf(steepHours: readonly number[]): number[] {
  return [...new Set(steepHours)].sort((a, b) => a - b);
}

/** The latest checkpoint the clock has reached, or null before the first one. */
export function activeCheckpoint(hour: number, checkpoints: readonly number[]): number | null {
  let active: number | null = null;
  for (const cp of checkpoints) if (cp <= hour) active = cp;
  return active;
}

export function nextCheckpoint(hour: number, checkpoints: readonly number[]): number | null {
  return checkpoints.find((cp) => cp > hour) ?? null;
}

/** One step back from what is showing: the checkpoint before the active one, or 0 (the start). */
export function previousCheckpoint(hour: number, checkpoints: readonly number[]): number | null {
  const active = activeCheckpoint(hour, checkpoints);
  if (active === null) return hour > 0 ? 0 : null;
  const before = checkpoints.filter((cp) => cp < active);
  return before.at(-1) ?? 0;
}

/** Window scroll position that puts a scrubbed section at the given hour. */
export function scrollTargetForHour(hour: number, sectionTop: number, scrollableDistance: number): number {
  return Math.round(sectionTop + progressForHour(hour) * scrollableDistance);
}

export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Two digits, as the clock face shows them. */
export function clockDigits(hour: number): [string, string] {
  const [tens, ones] = String(clamp(hour, 0, 99)).padStart(2, "0");
  return [tens!, ones!];
}

/** Deterministic small tilt per digit, so the typewriter strike looks random but renders the same everywhere. */
export function strikeTilt(digit: string, position: number, hour: number): number {
  return ((Number(digit) * 37 + position * 11 + hour * 7) % 9) - 4;
}

/** What the glass shows at a point in the steep (3D glass, D-068). Mirrors the SVG glass: level and darkness follow progress. */
export interface BrewLook {
  /** Share of the glass filled, 0 to 1. */
  readonly level: number;
  /** How far the colour has moved from amber to the dark brew, 0 to 0.9. */
  readonly darkness: number;
  /** Share of the grounds settled at the bottom, 0 to 1; it lags the colour, as grounds sink slowly. */
  readonly settled: number;
}

export function brewLook(progress: number): BrewLook {
  const p = clamp(progress, 0, 1);
  const s = clamp((p - 0.15) / 0.85, 0, 1);
  return { level: p, darkness: p * 0.9, settled: s * s * (3 - 2 * s) };
}

/** Linear mix of two #rrggbb colours, as 0 to 1 channels for a shader. */
export function mixColour(from: string, to: string, t: number): [number, number, number] {
  const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  const k = clamp(t, 0, 1);
  return [0, 1, 2].map((i) => channel(from, i) + (channel(to, i) - channel(from, i)) * k) as [number, number, number];
}
