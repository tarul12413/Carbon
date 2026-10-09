"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { HoldTimer } from "@/components/booking/HoldTimer";
import { DEMO_CHANGED } from "@/components/demo/DemoPanel";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { useNow } from "@/lib/useNow";
import type { ServiceErrorCode } from "@/services/errors";
import type { EventAvailability, WaitlistStatus } from "@/services/ticketing";
import { clientServices } from "@/services/client";

const t = copy.events;
const errors = copy.booking.errors;
const service = clientServices.ticketing;
const price = placeholders.ticketPriceLabel;
const maxPerOrder = placeholders.ticketsPerOrderMax.value;

const storageKey = (slug: string) => `carbon-demo:waitlist:${slug}`;
const savedEntry = (slug: string) => {
  try {
    return window.localStorage.getItem(storageKey(slug));
  } catch {
    return null;
  }
};
const saveEntry = (slug: string, id: string) => {
  try {
    window.localStorage.setItem(storageKey(slug), id);
  } catch {
    /* The status still shows for this visit. */
  }
};

const message = (key: string | undefined) => (key ? (errors[key as keyof typeof errors] ?? key) : undefined);

interface TicketPickerProps {
  readonly slug: string;
  /** A waitlist id from a claim link (?claim=wl_…). */
  readonly claim?: string;
}

/** Tickets with a seat hold, or the waitlist when sold out (wireframe 06, screens 2 and 3). */
export function TicketPicker({ slug, claim }: TicketPickerProps) {
  const router = useRouter();
  const keyFor = useIdempotencyKey();
  const [stock, setStock] = useState<EventAvailability | null | "error">(null);
  const [waitlist, setWaitlist] = useState<WaitlistStatus | null>(null);
  const [quantity, setQuantity] = useState(2);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ServiceErrorCode | "network" | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [contact, setContact] = useState({ phone: "", whatsappOptIn: true, privacyAccepted: false });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let live = true;
    service
      .getAvailability(slug)
      .then((result) => live && setStock(result.ok ? result.value : "error"))
      .catch(() => live && setStock("error"));
    const id = claim ?? savedEntry(slug);
    if (id) {
      service.getWaitlistEntry(id).then((result) => {
        if (live && result.ok && result.value.entry.eventSlug === slug) setWaitlist(result.value);
      });
    }
    return () => {
      live = false;
    };
  }, [slug, claim, refresh]);

  const reload = useCallback(() => setRefresh((n) => n + 1), []);
  useEffect(() => {
    window.addEventListener(DEMO_CHANGED, reload);
    return () => window.removeEventListener(DEMO_CHANGED, reload);
  }, [reload]);

  if (stock === null) return <p className="text-fg-muted">{t.tickets.checking}</p>;
  if (stock === "error") return <p className="text-danger">{t.tickets.error}</p>;

  const type = stock.ticketTypes[0];
  if (!type) return null;
  const left = type.left;
  const most = Math.min(left, maxPerOrder);
  const qty = Math.max(1, Math.min(quantity, most || maxPerOrder));

  const order = async (waitlistId?: string) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const input = {
      eventSlug: slug,
      ticketTypeId: type.id,
      quantity: waitlistId && waitlist ? waitlist.entry.quantity : qty,
      ...(waitlistId ? { waitlistId } : {}),
    };
    try {
      const result = await service.createOrder(input, keyFor(input));
      if (result.ok) {
        router.push(routes.checkout(result.value.id));
        return;
      }
      setProblem(result.error.code);
      if (result.error.left) setQuantity(result.error.left);
      reload();
    } catch {
      setProblem("network");
    }
    setBusy(false);
  };

  const join = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const honeypot = new FormData(event.currentTarget).get("website");
    const input = {
      eventSlug: slug,
      ticketTypeId: type.id,
      quantity: qty,
      ...contact,
      noticeVersion: placeholders.noticeVersion.value,
      website: typeof honeypot === "string" ? honeypot : "",
    };
    setBusy(true);
    setProblem(null);
    try {
      const result = await service.joinWaitlist(input, keyFor(input));
      if (result.ok) {
        saveEntry(slug, result.value.entry.id);
        setWaitlist(result.value);
        setFields({});
      } else {
        setFields(result.error.fields ?? {});
        if (result.error.code !== "invalid_input") setProblem(result.error.code);
      }
    } catch {
      setProblem("network");
    }
    setBusy(false);
  };

  const notice = problem && (
    <p role="alert" className="rounded-sm border border-danger p-3">
      {errors[problem]}
    </p>
  );

  if (waitlist && waitlist.entry.status !== "lapsed" && waitlist.entry.status !== "claimed") {
    return (
      <div className="flex flex-col gap-4">
        {notice}
        {waitlist.entry.status === "offered" && waitlist.entry.offerExpiresAt ? (
          <OfferPanel
            expiresAt={waitlist.entry.offerExpiresAt}
            busy={busy}
            onClaim={() => order(waitlist.entry.id)}
            onExpire={reload}
          />
        ) : (
          <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-5" role="status">
            <p className="text-h3 font-semibold">
              {waitlist.position !== null && t.waitlist.position(waitlist.position)}
            </p>
            <p className="text-fg-muted">{t.waitlist.sampleMessage}</p>
          </div>
        )}
      </div>
    );
  }

  if (type.state === "sold_out") {
    return (
      <form noValidate onSubmit={join} className="flex flex-col gap-5">
        <p className="rounded-sm bg-danger py-3 text-center text-h3 font-semibold text-carbon-black">
          {t.waitlist.soldOut}
        </p>
        {waitlist?.entry.status === "lapsed" && <p className="text-fg-muted">{t.waitlist.lapsed}</p>}
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-semibold">{t.waitlist.title}</h2>
          <p className="text-fg-muted">{t.waitlist.body}</p>
          <p className="text-small text-fg-muted">{t.waitlist.waiting(stock.waitlistLength)}</p>
        </div>
        {notice}
        <Stepper value={qty} max={maxPerOrder} label={t.waitlist.seats} onChange={setQuantity} />
        <TextField
          label={t.waitlist.phone}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={contact.phone}
          error={message(fields.phone)}
          onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
        />
        <div className="flex flex-col gap-1">
          <Checkbox
            label={t.waitlist.whatsapp}
            checked={contact.whatsappOptIn}
            onChange={(e) => setContact((c) => ({ ...c, whatsappOptIn: e.target.checked }))}
          />
          <Checkbox
            label={t.waitlist.privacy}
            checked={contact.privacyAccepted}
            error={message(fields.privacyAccepted)}
            onChange={(e) => setContact((c) => ({ ...c, privacyAccepted: e.target.checked }))}
          />
        </div>
        <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
          <label>
            {copy.booking.details.botLabel}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
          </label>
        </div>
        <Button type="submit" disabled={busy}>
          {t.waitlist.join}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {notice}
      {waitlist?.entry.status === "claimed" && <p className="text-success">{t.waitlist.claimed}</p>}
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="label-caps mb-3 text-small text-fg-muted">{t.tickets.legend}</legend>
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-line bg-surface-raised p-4">
          <div className="flex flex-col gap-1">
            <span className="text-h3 font-semibold">{type.name}</span>
            <span className="flex flex-wrap gap-x-4 font-mono text-fg-muted">
              <Tbc id={price.id}>{price.value}</Tbc>
              <span className={type.state === "few_left" ? "text-accent" : undefined}>{t.tickets.left(left)}</span>
            </span>
          </div>
          <Stepper value={qty} max={most} label={t.tickets.legend} onChange={setQuantity} />
        </div>
      </fieldset>
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <span className="text-fg-muted">{t.tickets.total}</span>
        <span className="font-mono text-h3 font-semibold">
          <Tbc id={price.id}>{price.value}</Tbc>
        </span>
      </div>
      <p className="text-small text-fg-muted">
        <Tbc id={placeholders.holdMinutes.id}>{t.tickets.hold(placeholders.holdMinutes.value)}</Tbc>{" "}
        <Tbc id={placeholders.ticketsPerOrderMax.id}>{t.tickets.max(maxPerOrder)}</Tbc>
      </p>
      <Button onClick={() => order()} disabled={busy}>
        {t.tickets.continue}
      </Button>
    </div>
  );
}

function Stepper({
  value,
  max,
  label,
  onChange,
}: {
  readonly value: number;
  readonly max: number;
  readonly label: string;
  readonly onChange: (n: number) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        className="inline-flex size-11 items-center justify-center rounded-full border-2 border-accent text-accent disabled:border-line disabled:text-fg-muted"
      >
        <Icon name="minus" label={t.tickets.fewer} />
      </button>
      <output aria-live="polite" className="min-w-[2ch] text-center text-h2 font-semibold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="inline-flex size-11 items-center justify-center rounded-full border-2 border-accent text-accent disabled:border-line disabled:text-fg-muted"
      >
        <Icon name="plus" label={t.tickets.more} />
      </button>
    </div>
  );
}

function OfferPanel({
  expiresAt,
  busy,
  onClaim,
  onExpire,
}: {
  readonly expiresAt: string;
  readonly busy: boolean;
  readonly onClaim: () => void;
  readonly onExpire: () => void;
}) {
  const now = useNow(1000);
  return (
    <div className="flex flex-col gap-4 rounded-md border border-accent p-5">
      <p className="text-h3 font-semibold">{t.waitlist.offeredTitle}</p>
      <p className="text-fg-muted">{t.waitlist.offeredBody}</p>
      {now && (
        <HoldTimer
          msLeft={Math.max(0, Date.parse(expiresAt) - now.getTime())}
          onExpire={onExpire}
          label={t.waitlist.timer}
        />
      )}
      <Button onClick={onClaim} disabled={busy}>
        {t.waitlist.claim}
      </Button>
      <p className="text-small text-fg-muted">
        <Tbc id={placeholders.waitlistClaimMinutes.id}>
          {t.waitlist.claimWindow(placeholders.waitlistClaimMinutes.value)}
        </Tbc>{" "}
        {t.waitlist.sampleMessage}
      </p>
    </div>
  );
}
