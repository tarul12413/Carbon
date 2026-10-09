import type { ReactNode } from "react";
import { flags } from "@/config/flags";

interface TbcProps {
  readonly children: ReactNode;
  /** Placeholder id from src/config/placeholders.ts, shown on hover. */
  readonly id: string;
}

/** Marks a value Carbon has not confirmed, so nobody mistakes a placeholder for a fact. */
export function Tbc({ children, id }: TbcProps) {
  if (!flags.showPlaceholders) return <>{children}</>;
  return (
    <span className="underline decoration-accent/70 decoration-dotted underline-offset-4" title={`Placeholder ${id}`}>
      {children}
      <span className="ml-1.5 inline-block rounded-sm border border-line-strong px-1 align-middle font-mono text-[0.6875rem] leading-4 text-fg-muted no-underline">
        TBC
      </span>
    </span>
  );
}
