"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextArea, TextField } from "@/components/ui/Field";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import type { Details } from "@/domain/booking/flow";
import { LIMITS } from "@/domain/booking/limits";

const t = copy.booking;

export type FieldErrors = Partial<Record<"name" | "phone" | "note" | "privacyAccepted", string>>;

interface DetailsStepProps {
  readonly details: Details;
  readonly errors: FieldErrors;
  readonly busy: boolean;
  readonly holdMinutes: number;
  readonly onChange: (details: Partial<Details>) => void;
  readonly onSubmit: (honeypot: string) => void;
}

const message = (key: string | undefined) => (key ? (t.errors[key as keyof typeof t.errors] ?? key) : undefined);

export function DetailsStep({ details, errors, busy, holdMinutes, onChange, onSubmit }: DetailsStepProps) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const honeypot = new FormData(event.currentTarget).get("website");
    onSubmit(typeof honeypot === "string" ? honeypot : "");
  };
  const errorList = Object.entries(errors).filter(([, v]) => v);

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {errorList.length > 0 && (
        <div role="alert" className="rounded-sm border border-danger p-4">
          <p className="font-medium">{t.details.errorsTitle}</p>
          <ul className="mt-1 list-disc pl-5 text-small">
            {errorList.map(([field, key]) => (
              <li key={field}>{message(key)}</li>
            ))}
          </ul>
        </div>
      )}
      <TextField
        label={t.details.name}
        name="name"
        autoComplete="name"
        maxLength={LIMITS.name}
        required
        value={details.name}
        error={message(errors.name)}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <TextField
        label={t.details.phone}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        placeholder="+91 98765 43210"
        value={details.phone}
        hint={t.details.phoneHint}
        error={message(errors.phone)}
        onChange={(e) => onChange({ phone: e.target.value })}
      />
      <TextArea
        label={t.details.note}
        name="note"
        maxLength={LIMITS.note}
        placeholder={t.details.notePlaceholder}
        value={details.note}
        hint={t.details.noteHint(LIMITS.note)}
        error={message(errors.note)}
        onChange={(e) => onChange({ note: e.target.value })}
      />
      <div className="flex flex-col gap-1">
        <Checkbox
          label={t.details.whatsapp}
          checked={details.whatsappOptIn}
          onChange={(e) => onChange({ whatsappOptIn: e.target.checked })}
        />
        <Checkbox
          label={t.details.privacy}
          checked={details.privacyAccepted}
          required
          error={message(errors.privacyAccepted)}
          onChange={(e) => onChange({ privacyAccepted: e.target.checked })}
        />
        <p className="pl-8 text-small text-fg-muted">
          <Link href={routes.legal} className="underline underline-offset-4">
            {t.details.privacyLink}
          </Link>{" "}
          · <Tbc id={placeholders.noticeVersion.id}>{t.details.noticeVersion(placeholders.noticeVersion.value)}</Tbc>
        </p>
      </div>
      {/* Honeypot: off-screen and skipped by keyboard and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          {t.details.botLabel}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <p className="text-small text-fg-muted">
        <Tbc id={placeholders.holdMinutes.id}>{t.details.holdNote(holdMinutes)}</Tbc>
      </p>
      <Button type="submit" disabled={busy} aria-disabled={busy}>
        {t.details.submit}
      </Button>
    </form>
  );
}
