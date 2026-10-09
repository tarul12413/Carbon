import { cx } from "@/lib/cx";
import { CarbonMark } from "./CarbonMark";

interface LogoProps {
  readonly className?: string;
  readonly withTagline?: boolean;
  readonly assemble?: boolean;
}

/** Mark plus wordmark. The wordmark is set in Jost until Carbon's logo font or vector lockup is supplied. */
export function Logo({ className, withTagline = false, assemble = false }: LogoProps) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <CarbonMark assemble={assemble} className="h-[1.6em] w-[1.6em] shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="font-medium tracking-[0.08em]">CARBON</span>
        {withTagline && <span className="mt-1 text-[0.5em] tracking-[0.3em] text-fg-muted">craft coffee bar</span>}
      </span>
    </span>
  );
}
