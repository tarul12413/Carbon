/** The contract between `useScene` and each 3D scene module (D-067). Kept free of three.js imports. */

export interface Scene {
  /** Draws one frame. Returns true while the scene wants another frame straight away. */
  frame(now: number): boolean;
  /** CSS pixel size of the canvas and the device pixel ratio to render at. */
  resize(width: number, height: number, dpr: number): void;
  dispose(): void;
}

export type CreateScene = (canvas: HTMLCanvasElement, host: HTMLElement, wake: () => void) => Scene;

/** A lazily imported scene module; the import pulls three.js in with it. */
export type SceneLoader = () => Promise<{ readonly createScene: CreateScene }>;

/** Reads a colour token from the page, so scenes follow the Night and Paper themes. */
export function cssColour(el: Element, name: string, fallback: string): string {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}
