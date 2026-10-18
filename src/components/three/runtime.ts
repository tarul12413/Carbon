import { flags } from "@/config/flags";
import { canRun3D, readDeviceSignals } from "@/lib/three/capability";
import type { CreateScene, Scene } from "./scene";
import styles from "./three.module.css";

/** The render side of the 3D layer (D-067), loaded only once a scene is about to start. */

const MAX_DPR = 1.75;

export function capable(): boolean {
  return canRun3D(readDeviceSignals(flags.threeD));
}

export function mount(host: HTMLElement, createScene: CreateScene) {
  const canvas = document.createElement("canvas");
  canvas.className = styles.canvas!;
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);

  let scene: Scene;
  try {
    scene = createScene(canvas, host, () => wake());
  } catch {
    canvas.remove();
    return undefined;
  }

  let visible = false;
  let raf = 0;
  let ready = false;
  const loop = (now: number) => {
    raf = 0;
    const more = scene.frame(now);
    if (!ready) {
      ready = true;
      host.setAttribute("data-3d", "ready");
    }
    if (more) wake();
  };
  function wake() {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(loop);
  }

  const size = () => {
    const box = canvas.getBoundingClientRect();
    scene.resize(box.width, box.height, Math.min(window.devicePixelRatio || 1, MAX_DPR));
    wake();
  };
  const resizer = new ResizeObserver(size);
  resizer.observe(canvas);
  size();

  const onScreen = new IntersectionObserver(([entry]) => {
    visible = Boolean(entry?.isIntersecting);
    wake();
  });
  onScreen.observe(host);
  document.addEventListener("visibilitychange", wake);

  const teardown = () => {
    cancelAnimationFrame(raf);
    resizer.disconnect();
    onScreen.disconnect();
    document.removeEventListener("visibilitychange", wake);
    canvas.removeEventListener("webglcontextlost", lost);
    host.removeAttribute("data-3d");
    scene.dispose();
    canvas.remove();
  };
  function lost(event: Event) {
    event.preventDefault();
    teardown();
  }
  canvas.addEventListener("webglcontextlost", lost);
  return teardown;
}
