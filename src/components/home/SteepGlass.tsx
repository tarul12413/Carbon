import { useId } from "react";
import styles from "./SteepClock.module.css";

/**
 * Hand-drawn tumbler. The liquid level and colour follow the --steep custom
 * property (0 to 1) set on an ancestor, so scrolling never re-renders React.
 * A static turbulence filter gives the outline its wobble.
 */
export function SteepGlass() {
  const id = useId().replace(/:/g, "");
  const clip = `${id}-clip`;
  const rough = `${id}-rough`;
  const light = `${id}-light`;

  return (
    <svg viewBox="0 0 120 170" className={styles.glass} aria-hidden="true">
      <defs>
        <filter id={rough}>
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="6" />
          <feDisplacementMap in="SourceGraphic" scale="3.5" />
        </filter>
        <clipPath id={clip}>
          <path d="M17 22 L103 21 L94 157 Q60 162 26 157 Z" />
        </clipPath>
        <linearGradient id={light} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-amber)" }} />
          <stop offset="1" stopColor="#7a4a1c" />
        </linearGradient>
      </defs>
      <g className={styles.drip}>
        <path d="M60 0 C63 6 65 9 65 12 a5 5 0 0 1 -10 0 C55 9 57 6 60 0Z" />
      </g>
      <g clipPath={`url(#${clip})`}>
        <rect x="0" y="20" width="120" height="145" fill={`url(#${light})`} className={styles.liquid} />
        <rect x="0" y="20" width="120" height="145" className={`${styles.liquid} ${styles.liquidDark}`} />
      </g>
      <path
        d="M14 19 C40 21 80 17 106 19 L97 158 C80 164 42 163 23 159 Z"
        className={styles.outline}
        filter={`url(#${rough})`}
      />
      <path d="M29 38 L34 132" className={styles.glint} filter={`url(#${rough})`} />
    </svg>
  );
}
