"use client";

import { useRef } from "react";
import { SteepGlass } from "@/components/home/SteepGlass";
import { cx } from "@/lib/cx";
import type { SceneLoader } from "./scene";
import styles from "./three.module.css";
import { useScene } from "./useScene";

const loadGlass: SceneLoader = () => import("./scenes/glass");

/** The SVG steep glass, with the 3D glass layered over it once three.js has loaded (D-068). */
export function SteepGlass3D() {
  const host = useRef<HTMLDivElement>(null);
  useScene(host, loadGlass);
  return (
    <div ref={host} className={cx(styles.host, styles.glass)} data-three="glass">
      <SteepGlass />
    </div>
  );
}
