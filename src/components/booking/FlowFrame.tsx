import type { ReactNode } from "react";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import type { OutletSlug } from "@/domain/outlet";
import { RadioCard } from "./RadioCard";

const t = copy.booking;

export interface FlowOutlet {
  readonly slug: OutletSlug;
  readonly name: string;
  readonly address: string;
  readonly addressTbc?: string;
}

interface FlowFrameProps {
  readonly header: ReactNode;
  readonly children: ReactNode;
  readonly action?: ReactNode;
  readonly summary: { readonly outlet?: string; readonly when?: string; readonly party?: string };
}

/**
 * The booking flow's layout: the step on the left, the summary beside it from tablet up
 * (Blueprint section 6). Shared by the flow and its server-rendered first paint, so the swap
 * from one to the other does not move anything.
 */
export function FlowFrame({ header, children, action, summary }: FlowFrameProps) {
  return (
    <div className="content-cap fold-grid gap-y-8 py-8 tablet:items-start tablet:gap-x-12 laptop:grid-cols-[minmax(0,40rem)_20rem] laptop:py-14">
      <div className="flex flex-col gap-6">
        {header}
        {children}
        {action && (
          <div className="sticky bottom-0 z-10 -mx-4 bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] tablet:static tablet:m-0 tablet:bg-transparent tablet:p-0 [&>*]:w-full tablet:[&>*]:w-auto">
            {action}
          </div>
        )}
      </div>
      <aside aria-label={t.summary} className="hidden flex-col gap-3 rounded-sm border border-line p-5 tablet:flex">
        <p className="label-caps text-small text-fg-muted">{t.summary}</p>
        <dl className="flex flex-col gap-2">
          <SummaryRow label={t.review.outlet} value={summary.outlet} />
          <SummaryRow label={t.review.when} value={summary.when} />
          <SummaryRow label={t.review.party} value={summary.party} />
        </dl>
      </aside>
    </div>
  );
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-right font-medium">{value ?? "—"}</dd>
    </div>
  );
}

interface OutletChoicesProps {
  readonly outlets: readonly FlowOutlet[];
  readonly selected?: OutletSlug;
  readonly onSelect?: (slug: OutletSlug) => void;
}

/** Step one. Without `onSelect` it renders as a static first paint. */
export function OutletChoices({ outlets, selected, onSelect }: OutletChoicesProps) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="sr-only">{t.outletLegend}</legend>
      {outlets.map((o) => (
        <RadioCard
          key={o.slug}
          name="outlet"
          value={o.slug}
          {...(onSelect ? { checked: selected === o.slug, onChange: () => onSelect(o.slug) } : {})}
          title={o.name}
          hint={o.addressTbc ? <Tbc id={o.addressTbc}>{o.address}</Tbc> : o.address}
        />
      ))}
    </fieldset>
  );
}
