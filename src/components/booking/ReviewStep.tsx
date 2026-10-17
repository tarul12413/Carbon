"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { formatIndianMobile } from "@/domain/booking/phone";
import { LIMITS } from "@/domain/booking/limits";
import { useSettled } from "@/lib/useSettled";
import type { Booking } from "@/domain/booking/schema";
import { SummaryList } from "./BookingSummary";
import { whenShort } from "./format";
import { RadioCard } from "./RadioCard";

const t = copy.booking;

export const summaryRows = (booking: Booking, outletName: string) =>
  [
    [t.review.outlet, outletName],
    [t.review.when, whenShort(booking.date, booking.time)],
    [t.review.party, String(booking.partySize)],
    [t.review.name, booking.name],
    [t.review.phone, formatIndianMobile(booking.phone)],
    ...(booking.note ? [[t.review.note, booking.note] as const] : []),
  ] as const;

interface ReviewStepProps {
  readonly booking: Booking;
  readonly outletName: string;
  readonly busy: boolean;
  readonly onConfirm: (payment: "cafe" | "online") => void;
}

/** Step five for small groups: summary and the pay choice (wireframe 05, screen 4). */
export function ReviewStep({ booking, outletName, busy, onConfirm }: ReviewStepProps) {
  const [payment, setPayment] = useState<"cafe" | "online">("cafe");
  /* The second tap of a double tap on "Review" must not pick a payment or confirm (D-061). */
  const settled = useSettled();
  const choose = (value: "cafe" | "online") => (event: { readonly timeStamp: number }) => {
    if (settled(event)) setPayment(value);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (settled(event)) onConfirm(payment);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <SummaryList rows={summaryRows(booking, outletName)} />
      <fieldset className="flex flex-col gap-3">
        <legend className="label-caps mb-3 text-small text-fg-muted">{t.review.payLegend}</legend>
        <RadioCard
          name="payment"
          value="cafe"
          checked={payment === "cafe"}
          onChange={choose("cafe")}
          title={t.review.payCafe}
          hint={t.review.payCafeHint}
        />
        <RadioCard
          name="payment"
          value="online"
          checked={payment === "online"}
          onChange={choose("online")}
          title={t.review.payOnline}
          hint={
            <>
              {t.review.payOnlineHint}{" "}
              <Tbc id={placeholders.depositPriceLabel.id}>{placeholders.depositPriceLabel.value}</Tbc>
            </>
          }
        />
      </fieldset>
      <Button type="submit" disabled={busy} aria-disabled={busy}>
        {busy ? t.review.confirming : payment === "online" ? t.review.toPayment : t.review.confirm}
      </Button>
    </form>
  );
}

export interface RequestFields {
  readonly occasion: string;
  readonly budgetPerHead: string;
}

interface RequestStepProps {
  readonly booking: Booking;
  readonly outletName: string;
  readonly busy: boolean;
  readonly errors: Partial<Record<keyof RequestFields, string>>;
  readonly onSend: (fields: RequestFields) => void;
}

const message = (key: string | undefined) => (key ? (t.errors[key as keyof typeof t.errors] ?? key) : undefined);

/** Step five for large groups: the request form (wireframe 05, screen 6). */
export function RequestStep({ booking, outletName, busy, errors, onSend }: RequestStepProps) {
  const [fields, setFields] = useState<RequestFields>({ occasion: "", budgetPerHead: "" });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSend(fields);
  };
  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <p className="text-h3 font-normal text-fg-muted">{t.request.intro}</p>
      <SummaryList rows={summaryRows(booking, outletName)} />
      <TextField
        label={t.request.occasion}
        name="occasion"
        required
        maxLength={LIMITS.occasion}
        placeholder={t.request.occasionPlaceholder}
        value={fields.occasion}
        error={fields.occasion.trim() ? undefined : message(errors.occasion)}
        onChange={(e) => setFields((f) => ({ ...f, occasion: e.target.value }))}
      />
      <TextField
        label={t.request.budget}
        name="budgetPerHead"
        maxLength={LIMITS.budget}
        hint={t.request.budgetHint}
        value={fields.budgetPerHead}
        error={message(errors.budgetPerHead)}
        onChange={(e) => setFields((f) => ({ ...f, budgetPerHead: e.target.value }))}
      />
      <p className="flex items-center gap-3 rounded-sm border border-line p-4">
        <span className="size-3 rounded-full bg-accent" aria-hidden="true" />
        <span>
          <span className="text-fg-muted">{t.request.status}</span>{" "}
          <span className="font-semibold text-accent">{t.request.requested}</span>
        </span>
      </p>
      <Button type="submit" disabled={busy} aria-disabled={busy}>
        {busy ? t.request.sending : t.request.send}
      </Button>
    </form>
  );
}
