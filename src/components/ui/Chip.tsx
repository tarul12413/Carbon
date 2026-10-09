import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

interface ChipProps {
  readonly children: ReactNode;
  readonly tone?: "accent" | "outline";
  readonly className?: string;
}

/** Small mono label: steep times ("28h"), codes, tags. */
export function Chip({ children, tone = "accent", className }: ChipProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-small font-medium",
        tone === "accent" ? "bg-accent text-on-accent" : "border border-line-strong text-fg",
        className,
      )}
    >
      {children}
    </span>
  );
}
