"use client";

import { useId, useState, type CSSProperties } from "react";
import type { Brew } from "@/components/home/BrewCard";
import { SteepGlass } from "@/components/home/SteepGlass";
import { Chip } from "@/components/ui/Chip";
import { copy } from "@/content/copy";
import { MAX_STEEP_HOURS, activeCheckpoint, checkpointsOf, progressForHour } from "@/domain/steep";
import { cx } from "@/lib/cx";

const t = copy.coldBrew.explorer;

/** A slider instead of scroll: pick a steep time and see which brews are ready. */
export function SteepExplorer({ brews }: { readonly brews: readonly Brew[] }) {
  const [hours, setHours] = useState(0);
  const sliderId = useId();
  const checkpoints = checkpointsOf(brews.map((b) => b.steepHours));
  const latest = activeCheckpoint(hours, checkpoints);
  const ready = brews.filter((b) => b.steepHours <= hours);

  return (
    <div
      className="grid gap-8 rounded-md border border-line bg-surface-raised p-5 tablet:grid-cols-[auto_1fr] tablet:p-8"
      style={{ "--steep": progressForHour(hours) } as CSSProperties}
    >
      <div className="flex justify-center tablet:w-40">
        <div className="w-24 tablet:w-32">
          <SteepGlass />
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <label htmlFor={sliderId} className="flex items-baseline justify-between gap-4">
            <span className="label-caps text-small text-fg-muted">{t.label}</span>
            <output htmlFor={sliderId} className="font-mono text-h2 text-accent tabular-nums">
              {hours}h
            </output>
          </label>
          <input
            id={sliderId}
            type="range"
            min={0}
            max={MAX_STEEP_HOURS}
            step={1}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
            aria-valuetext={t.value(hours)}
            className="h-11 w-full cursor-pointer accent-[var(--accent)]"
          />
          <div className="flex flex-wrap gap-2">
            {checkpoints.map((cp) => (
              <button
                key={cp}
                type="button"
                aria-pressed={hours === cp}
                onClick={() => setHours(cp)}
                className={cx(
                  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 font-mono text-small",
                  hours === cp ? "border-accent bg-accent text-on-accent" : "border-line-strong",
                )}
              >
                {cp}h
              </button>
            ))}
          </div>
        </div>
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="font-medium">{ready.length === 0 ? t.none : t.ready(ready.length)}</p>
          {ready.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {ready.map((brew) => (
                <li key={brew.id}>
                  <Chip tone={brew.steepHours === latest ? "accent" : "outline"}>
                    {brew.name} · {brew.steepHours}h
                  </Chip>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
