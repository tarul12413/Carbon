import type { ReactNode } from "react";

/** Label and value rows for the review step and the booking page. */
export function SummaryList({ rows }: { readonly rows: readonly (readonly [string, ReactNode])[] }) {
  return (
    <dl className="flex flex-col divide-y divide-line rounded-sm border border-line bg-surface-raised px-4">
      {rows.map(([label, value]) => (
        <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
          <dt className="text-fg-muted">{label}</dt>
          <dd className="text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
