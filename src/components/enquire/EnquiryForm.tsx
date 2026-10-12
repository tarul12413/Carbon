"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { RadioCard } from "@/components/booking/RadioCard";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextArea, TextField, inputClass } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import type { Enquiry } from "@/domain/enquiry/schema";
import { ENQUIRY_LIMITS, ENQUIRY_TYPES, type EnquiryType } from "@/domain/enquiry/types";
import type { OutletSlug } from "@/domain/outlet";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { clientServices } from "@/services/client";

const t = copy.enquire;
const whatsappHref = `https://wa.me/${placeholders.whatsappNumber.value.replace(/\D/g, "")}`;

interface EnquiryFormProps {
  readonly initialType?: EnquiryType;
  readonly outlets: readonly { readonly slug: OutletSlug; readonly name: string }[];
  /** Earliest date the picker offers, YYYY-MM-DD in Jaipur. */
  readonly today: string;
}

type Values = {
  type: EnquiryType | "";
  name: string;
  phone: string;
  outlet: OutletSlug | "";
  date: string;
  guests: string;
  details: string;
};

const errorText = (key: string) => t.errors[key as keyof typeof t.errors] ?? copy.booking.errors.invalid_input;

/** /enquire (brief): catering, collab or launch, workshop, other. */
export function EnquiryForm({ initialType, outlets, today }: EnquiryFormProps) {
  const [values, setValues] = useState<Values>({
    type: initialType ?? "",
    name: "",
    phone: "",
    outlet: "",
    date: "",
    guests: "",
    details: "",
  });
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [done, setDone] = useState<Enquiry | null>(null);
  const keyFor = useIdempotencyKey();
  const heading = useRef<HTMLHeadingElement>(null);
  const set =
    <K extends keyof Values>(k: K) =>
    (v: Values[K]) =>
      setValues((old) => ({ ...old, [k]: v }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const input = {
      ...values,
      type: values.type as EnquiryType,
      whatsappOptIn,
      privacyAccepted,
      noticeVersion: placeholders.noticeVersion.value,
      website,
    };
    try {
      const result = await clientServices.enquiries.submit(input, keyFor(input));
      if (result.ok) {
        setErrors({});
        setDone(result.value);
        requestAnimationFrame(() => heading.current?.focus());
      } else if (result.error.code === "invalid_input") setErrors(result.error.fields ?? {});
      else setProblem(copy.booking.errors[result.error.code]);
    } catch {
      setProblem(copy.booking.errors.network);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <h1 ref={heading} tabIndex={-1} className="text-display font-semibold outline-none">
          {t.doneTitle}
        </h1>
        <p className="font-mono text-h2 text-accent">{t.reference(done.code)}</p>
        <p className="text-h3 text-fg-muted">
          {t.reply} <Tbc id={placeholders.enquiryReplyTime.id}>{placeholders.enquiryReplyTime.value}</Tbc>.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href={whatsappHref} className="inline-flex min-h-11 items-center gap-2 text-accent">
            <Icon name="chat" />
            <Tbc id={placeholders.whatsappNumber.id}>{t.whatsappNow}</Tbc>
          </a>
        </div>
        <Button
          variant="secondary"
          className="self-start"
          onClick={() => {
            setValues((v) => ({ ...v, details: "", date: "", guests: "" }));
            setDone(null);
          }}
        >
          {t.another}
        </Button>
      </div>
    );
  }

  const err = (k: string) => (errors[k] ? errorText(errors[k]) : undefined);

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-display font-semibold">{t.title}</h1>
        <p className="text-h3 text-fg-muted">{t.lead}</p>
      </div>

      <fieldset className="flex min-w-0 flex-col gap-3" aria-describedby={errors.type ? "type-error" : undefined}>
        <legend className="mb-3 text-h3 font-semibold">{t.typeLegend}</legend>
        <div className="grid gap-3 tablet:grid-cols-2">
          {ENQUIRY_TYPES.map((type) => (
            <RadioCard
              key={type}
              name="type"
              value={type}
              checked={values.type === type}
              onChange={() => set("type")(type)}
              title={t.types[type].label}
              hint={t.types[type].hint}
            />
          ))}
        </div>
        {errors.type && (
          <p id="type-error" className="text-small text-danger">
            {err("type")}
          </p>
        )}
      </fieldset>

      <div className="grid gap-5 tablet:grid-cols-2">
        <TextField
          label={t.name}
          autoComplete="name"
          value={values.name}
          maxLength={ENQUIRY_LIMITS.name}
          onChange={(e) => set("name")(e.target.value)}
          error={err("name")}
        />
        <TextField
          label={t.phone}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={values.phone}
          onChange={(e) => set("phone")(e.target.value)}
          error={err("phone")}
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="enquiry-outlet" className="font-medium">
            {t.outlet}
          </label>
          <select
            id="enquiry-outlet"
            className={inputClass}
            value={values.outlet}
            onChange={(e) => set("outlet")(e.target.value as OutletSlug | "")}
          >
            <option value="">{t.anyOutlet}</option>
            {outlets.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <TextField
          label={t.date}
          type="date"
          min={today}
          value={values.date}
          onChange={(e) => set("date")(e.target.value)}
          hint={t.optional}
          error={err("date")}
        />
        <TextField
          label={t.guests}
          type="number"
          inputMode="numeric"
          min={1}
          max={ENQUIRY_LIMITS.guestsMax}
          value={values.guests}
          onChange={(e) => set("guests")(e.target.value)}
          hint={t.optional}
          error={err("guests")}
        />
      </div>

      <TextArea
        label={t.details}
        rows={5}
        value={values.details}
        maxLength={ENQUIRY_LIMITS.details}
        onChange={(e) => set("details")(e.target.value)}
        hint={t.detailsHint(ENQUIRY_LIMITS.detailsMin, ENQUIRY_LIMITS.details)}
        error={err("details")}
      />

      <div className="flex flex-col gap-1">
        <Checkbox label={t.whatsapp} checked={whatsappOptIn} onChange={(e) => setWhatsappOptIn(e.target.checked)} />
        <Checkbox
          label={t.privacy}
          checked={privacyAccepted}
          onChange={(e) => setPrivacyAccepted(e.target.checked)}
          error={err("privacyAccepted")}
        />
        <p className="text-small text-fg-muted">
          <Link href={routes.legal} className="text-accent underline underline-offset-4">
            {copy.wall.notice}
          </Link>{" "}
          ·{" "}
          <Tbc id={placeholders.noticeVersion.id}>
            {copy.booking.details.noticeVersion(placeholders.noticeVersion.value)}
          </Tbc>
        </p>
      </div>
      {/* Honeypot: off-screen and skipped by keyboard and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          {copy.booking.details.botLabel}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full tablet:w-auto tablet:self-start">
        {busy ? t.sending : t.submit}
      </Button>
    </form>
  );
}
