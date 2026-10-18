"use client";

import { useEffect, type RefObject } from "react";
import type { SceneLoader } from "./scene";

/** Keeps the first seconds for hydration, the first paint and the first taps (LCP, INP). */
const IDLE_DELAY_MS = 2500;
const WAKE_EVENTS = ["scroll", "pointermove", "pointerdown", "keydown", "touchstart"] as const;

/**
 * Mounts a 3D scene over `host` (D-067). three.js and the scene load after the page: on the first
 * scroll, pointer move, tap or key, or once the page has been idle a while, and only when the host
 * is near the screen. The host's own content (the SVG or HTML version) stays underneath; CSS
 * cross-fades to the canvas once `data-3d="ready"` is set, and back if the GPU drops the context.
 *
 * Only this trigger ships in the first load; the capability check and the render loop (`runtime`)
 * load with the first wake, and three.js only once the device passes the check.
 */
export function useScene(host: RefObject<HTMLElement | null>, load: SceneLoader): void {
  useEffect(() => {
    const el = host.current;
    if (!el) return;

    let disposed = false;
    let woken = false;
    let near = false;
    let started = false;
    let teardown: (() => void) | undefined;

    const start = async () => {
      if (started || !woken || !near || disposed) return;
      started = true;
      stopWatching();
      const runtime = await import("./runtime").catch(() => null);
      if (disposed || !runtime?.capable()) return;
      const { createScene } = await load().catch(() => ({ createScene: null }));
      if (disposed || !createScene) return;
      teardown = runtime.mount(el, createScene);
    };

    const wake = () => {
      woken = true;
      void start();
    };
    const nearby = new IntersectionObserver(
      ([entry]) => {
        near = Boolean(entry?.isIntersecting);
        void start();
      },
      { rootMargin: "50% 0px" },
    );
    nearby.observe(el);
    for (const name of WAKE_EVENTS) window.addEventListener(name, wake, { passive: true, once: true });

    let idleTimer: number | undefined;
    const afterLoad = () => {
      idleTimer = window.setTimeout(() => {
        if ("requestIdleCallback" in window) window.requestIdleCallback(wake, { timeout: 2000 });
        else wake();
      }, IDLE_DELAY_MS);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });

    function stopWatching() {
      nearby.disconnect();
      for (const name of WAKE_EVENTS) window.removeEventListener(name, wake);
      window.removeEventListener("load", afterLoad);
      window.clearTimeout(idleTimer);
    }

    return () => {
      disposed = true;
      stopWatching();
      teardown?.();
    };
  }, [host, load]);
}
