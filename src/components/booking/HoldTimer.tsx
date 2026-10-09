"use client";

import { useEffect, useRef } from "react";
import { copy } from "@/content/copy";
import { formatCountdown } from "@/domain/booking/hold";

const t = copy.booking.hold;
/** Announce at these marks, not every second (screen readers would never stop talking). */
const ANNOUNCE_AT = [5 * 60_000, 60_000];

interface HoldTimerProps {
  readonly msLeft: number;
  readonly onExpire: () => void;
  /** Defaults to "Table held for". */
  readonly label?: string;
}

export function HoldTimer({ msLeft, onExpire, label = t.label }: HoldTimerProps) {
  const announced = useRef(new Set<number>());
  const live = useRef<HTMLParagraphElement>(null);
  const expired = msLeft <= 0;

  useEffect(() => {
    const mark = ANNOUNCE_AT.find((m) => msLeft <= m && msLeft > m - 2_000 && !announced.current.has(m));
    if (mark !== undefined && live.current) {
      announced.current.add(mark);
      live.current.textContent = `${label} ${formatCountdown(msLeft)}.`;
    }
  }, [msLeft, label]);

  useEffect(() => {
    if (expired) onExpire();
  }, [expired, onExpire]);

  return (
    <div className="flex items-center justify-center gap-2 rounded-full bg-surface-raised px-4 py-2 font-mono font-medium text-accent">
      <span>{label}</span>
      <span role="timer" aria-label={label} className="tabular-nums">
        {formatCountdown(msLeft)}
      </span>
      <p ref={live} className="sr-only" aria-live="polite" />
    </div>
  );
}
