"use client";

import { useState } from "react";
import { cx } from "@/lib/cx";

interface StampGridProps {
  readonly stamps: number;
  readonly threshold: number;
  readonly label: string;
  readonly size?: "large" | "small";
}

/** The card (wireframe 09): filled circles carry Carbon's "C"; a new stamp lands with a bounce. */
export function StampGrid({ stamps, threshold, label, size = "large" }: StampGridProps) {
  /* Stamps from `landedFrom` up arrived since the last render, so they animate in. */
  const [shown, setShown] = useState(stamps);
  const [landedFrom, setLandedFrom] = useState(stamps);
  if (stamps !== shown) {
    setLandedFrom(shown);
    setShown(stamps);
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={cx(
        "grid grid-cols-4 gap-3 rounded-md border border-line bg-surface-raised tablet:gap-4",
        size === "large" ? "p-5 tablet:p-8" : "p-4",
      )}
    >
      {Array.from({ length: threshold }, (_, i) => {
        const filled = i < stamps;
        return (
          <span
            key={i}
            className={cx(
              "flex aspect-square items-center justify-center rounded-full border-2 font-semibold",
              size === "large" ? "text-h2" : "text-h3",
              filled ? "border-accent bg-accent text-on-accent" : "border-line-strong",
              filled && i >= landedFrom && "stamp-land",
            )}
          >
            {filled ? "C" : ""}
          </span>
        );
      })}
    </div>
  );
}
