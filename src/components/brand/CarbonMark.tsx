import { cx } from "@/lib/cx";

/**
 * Carbon's four-glyph mark (leaf, circle, dot grid, waves), redrawn as SVG from
 * docs/logo.png at its measured geometry so it stays sharp and takes the theme colour.
 * Replace with Carbon's vector file when they supply one (OPEN_QUESTIONS Q-01).
 */

const LEAF = "M0 0C12 2 29 9 29 20V40C17 38 0 30 0 18Z";
const DOT_X = [4, 21.5, 39, 57] as const;
const DOT_Y = [92, 106.1, 120.2, 134.3, 148.4] as const;
const WAVE_TOPS = [88, 104, 120, 136] as const;

interface CarbonMarkProps {
  readonly className?: string;
  /** Glyphs assemble one by one on first paint; skipped for reduced motion. */
  readonly assemble?: boolean;
  /** Accessible name. Omit when the mark sits next to the word "Carbon". */
  readonly title?: string;
}

export function CarbonMark({ className, assemble = false, title }: CarbonMarkProps) {
  return (
    <svg
      viewBox="0 0 152 152"
      fill="currentColor"
      className={cx(assemble && "mark-assemble", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <g className="mark-glyph">
        <path d={LEAF} transform="translate(0.5 3)" />
        <path d={LEAF} transform="translate(0.5 36)" />
        <path d={LEAF} transform="translate(62.5 1) scale(-1 1)" />
        <path d={LEAF} transform="translate(62.5 35) scale(-1 1)" />
      </g>
      <g className="mark-glyph">
        <circle cx="115" cy="37.5" r="37.5" />
      </g>
      <g className="mark-glyph">
        {DOT_Y.map((y) => DOT_X.map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="4" />))}
      </g>
      <g className="mark-glyph" fill="none" stroke="currentColor" strokeWidth="7.5" strokeLinejoin="miter">
        {WAVE_TOPS.map((t) => (
          <polyline
            key={t}
            points={`78,${t + 10.5} 96.5,${t + 3.75} 115,${t + 11.25} 133.5,${t + 3.75} 152,${t + 10.5}`}
          />
        ))}
      </g>
    </svg>
  );
}
