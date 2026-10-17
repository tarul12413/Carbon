"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { TOTAL_STEPS } from "@/domain/booking/flow";
import { cx } from "@/lib/cx";

const t = copy.booking;

interface StepHeaderProps {
  readonly step: number;
  readonly title: ReactNode;
  readonly onBack?: () => void;
  readonly children?: ReactNode;
}

/** Step count, progress segments and the step heading, which takes focus when the step changes. */
export function StepHeader({ step, title, onBack, children }: StepHeaderProps) {
  const heading = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    /* Once the new step has painted: focusing forces a layout, which would hold up the tap's response. */
    let timer = 0;
    const frame = requestAnimationFrame(() => {
      timer = window.setTimeout(() => heading.current?.focus());
    });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [step]);

  return (
    <header className="flex flex-col gap-4">
      <div className="flex min-h-11 items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex size-11 items-center justify-center rounded-sm text-fg hover-fine:text-accent"
          >
            <Icon name="arrowLeft" label={t.back} />
          </button>
        )}
        <p className="font-mono text-small text-fg-muted">{t.stepOf(step, TOTAL_STEPS)}</p>
      </div>
      <ol className="grid grid-cols-6 gap-1.5" aria-hidden="true">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <li key={i} className={cx("h-1 rounded-full", i < step ? "bg-accent" : "bg-line")} />
        ))}
      </ol>
      <h1 ref={heading} tabIndex={-1} className="text-h1 font-semibold text-balance outline-none">
        {title}
      </h1>
      {children}
    </header>
  );
}
