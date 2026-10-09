import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

interface SectionHeadingProps {
  readonly id: string;
  readonly eyebrow: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function SectionHeading({ id, eyebrow, children, className }: SectionHeadingProps) {
  return (
    <header className={cx("flex flex-col gap-3", className)}>
      <p className="label-caps text-small text-fg-muted">{eyebrow}</p>
      <h2 id={id} className="text-h2 font-semibold text-balance">
        {children}
      </h2>
    </header>
  );
}
