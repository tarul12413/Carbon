import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

type RadioCardProps = Omit<ComponentProps<"input">, "type"> & {
  readonly title: ReactNode;
  readonly hint?: ReactNode;
};

/** A native radio dressed as a card, as in wireframe 04 (outlet) and 05 (pay choice). */
export function RadioCard({ title, hint, className, ...input }: RadioCardProps) {
  return (
    <label
      className={cx(
        "flex min-h-14 cursor-pointer items-center gap-4 rounded-sm border border-line-strong bg-surface-raised px-4 py-3",
        "has-checked:border-accent has-checked:outline has-checked:outline-1 has-checked:outline-accent",
        "has-disabled:cursor-not-allowed has-disabled:opacity-60",
        className,
      )}
    >
      <input type="radio" className="size-5 shrink-0 accent-accent" {...input} />
      <span className="flex flex-col gap-0.5">
        <span className="text-h3 font-medium">{title}</span>
        {hint && <span className="text-fg-muted">{hint}</span>}
      </span>
    </label>
  );
}
