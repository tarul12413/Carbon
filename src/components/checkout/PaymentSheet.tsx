"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { flags } from "@/config/flags";
import { cx } from "@/lib/cx";
import type { PaymentOutcome } from "@/services/ticketing";

const t = copy.checkout.sheet;
const METHODS = ["upi", "cards", "netbanking", "wallets"] as const;
const OUTCOMES: readonly PaymentOutcome[] = ["captured", "failed", "pending"];

interface PaymentSheetProps {
  readonly open: boolean;
  readonly description: string;
  readonly amount: string;
  readonly busy: boolean;
  readonly onPay: (outcome: PaymentOutcome) => void;
  readonly onClose: () => void;
}

/**
 * A clearly labelled sample of a hosted payment sheet (brief: never imitate a real gateway's
 * branding). Generic methods only; nothing typed here is sent anywhere. With the dev panel on,
 * the outcome is picked here: success, failed or pending.
 */
export function PaymentSheet({ open, description, amount, busy, onPay, onClose }: PaymentSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [method, setMethod] = useState<(typeof METHODS)[number]>("upi");
  const [outcome, setOutcome] = useState<PaymentOutcome>("captured");

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      data-theme="paper"
      className="mx-auto mt-auto mb-0 w-full max-w-md rounded-t-md bg-surface p-0 text-fg backdrop:bg-carbon-black/80 tablet:my-auto tablet:rounded-md"
    >
      <form
        method="dialog"
        className="flex flex-col gap-5 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onPay(flags.devPanel ? outcome : "captured");
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 id={titleId} className="text-h3 font-semibold">
              {t.title}
            </h2>
            <p className="font-mono text-small text-fg-muted">{t.label}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-sm"
          >
            <Icon name="close" label={t.cancel} />
          </button>
        </div>

        <div className="flex items-baseline justify-between gap-4 border-y border-line py-3">
          <span className="text-fg-muted">{description}</span>
          <span className="font-mono text-h3 font-semibold">{amount}</span>
        </div>

        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="label-caps mb-2 text-small text-fg-muted">{t.methodsLegend}</legend>
          {METHODS.map((m) => (
            <label
              key={m}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-line px-3 has-checked:border-line-strong has-checked:bg-surface-raised"
            >
              <input
                type="radio"
                name="method"
                value={m}
                checked={method === m}
                onChange={() => setMethod(m)}
                className="size-4 accent-accent"
              />
              <span className="font-medium">{t.methods[m]}</span>
            </label>
          ))}
        </fieldset>

        {method === "upi" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2" aria-hidden="true">
              {Array.from({ length: 4 }, (_, i) => (
                <span
                  key={i}
                  className="flex aspect-square items-center justify-center rounded-sm border border-line text-center text-small text-fg-muted"
                >
                  {t.upiApps}
                </span>
              ))}
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="font-medium">{t.upiId}</span>
              <input
                type="text"
                inputMode="email"
                autoComplete="off"
                placeholder={t.upiPlaceholder}
                className="min-h-12 rounded-sm border border-line-strong bg-surface-raised px-3.5 text-fg placeholder:text-fg-muted"
              />
            </label>
          </div>
        )}

        {flags.devPanel && (
          <fieldset className="flex min-w-0 flex-col gap-2 rounded-sm border border-dashed border-line-strong p-3">
            <legend className="px-1 font-mono text-small text-fg-muted">{t.outcomeLegend}</legend>
            <div className="flex flex-wrap gap-2">
              {OUTCOMES.map((o) => (
                <label key={o} className="relative">
                  <input
                    type="radio"
                    name="outcome"
                    value={o}
                    checked={outcome === o}
                    onChange={() => setOutcome(o)}
                    className="peer sr-only"
                  />
                  <span
                    className={cx(
                      "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 font-medium",
                      "border-line-strong peer-checked:border-fg peer-checked:bg-fg peer-checked:text-surface",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring)",
                    )}
                  >
                    {t.outcomes[o]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <button
          type="submit"
          disabled={busy}
          className="inline-flex min-h-12 items-center justify-center rounded-sm bg-fg px-5 font-semibold text-surface disabled:opacity-50"
        >
          {t.pay(amount)}
        </button>
      </form>
    </dialog>
  );
}
