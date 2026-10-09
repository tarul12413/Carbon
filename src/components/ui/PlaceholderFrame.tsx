import { cx } from "@/lib/cx";

interface PlaceholderFrameProps {
  /** What photo goes here, e.g. "Outlet photo: C Scheme". */
  readonly label: string;
  readonly className?: string;
}

/** A clearly labelled empty frame where a real photo will go. No stock images. */
export function PlaceholderFrame({ label, className }: PlaceholderFrameProps) {
  return (
    <div
      role="img"
      aria-label={`Photo to come: ${label}`}
      className={cx("relative overflow-hidden rounded-sm border border-line bg-surface-raised", className)}
    >
      <svg className="absolute inset-0 size-full text-line" preserveAspectRatio="none" aria-hidden="true">
        <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1" />
        <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" />
      </svg>
      <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-mono text-small text-fg-muted">
        <span className="bg-surface-raised px-2">{label}</span>
      </span>
    </div>
  );
}
