"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { whenShort } from "@/components/booking/format";
import { HoldTimer } from "@/components/booking/HoldTimer";
import { RadioCard } from "@/components/booking/RadioCard";
import { DemoPanel } from "@/components/demo/DemoPanel";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { flags } from "@/config/flags";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { holdMsLeft } from "@/domain/booking/hold";
import type { Booking } from "@/domain/booking/schema";
import type { Order } from "@/domain/orders/schema";
import { localDate } from "@/domain/time";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { useNow } from "@/lib/useNow";
import { clientServices } from "@/services/client";
import type { ServiceErrorCode } from "@/services/errors";
import type { GatewayOrder, PaymentOutcome } from "@/services/ticketing";
import { PaymentSheet } from "./PaymentSheet";

const t = copy.checkout;
const errors = copy.booking.errors;
const { ticketing, gateway, bookings } = clientServices;

export interface CheckoutEvent {
  readonly slug: string;
  readonly title: string;
  readonly outletName: string;
}

interface CheckoutProps {
  readonly orderId: string;
  readonly events: readonly CheckoutEvent[];
  readonly outletNames: Readonly<Record<string, string>>;
}

type Load =
  | { readonly state: "loading" }
  | { readonly state: "missing" }
  | { readonly state: "ready"; readonly order: Order; readonly booking: Booking | null };

const message = (key: string | undefined) => (key ? (errors[key as keyof typeof errors] ?? key) : undefined);

/** /checkout/[orderId]: pay choice, the sample payment sheet, and the failed and pending screens (wireframes 07, 08). */
export function Checkout({ orderId, events, outletNames }: CheckoutProps) {
  const router = useRouter();
  const keyFor = useIdempotencyKey();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [method, setMethod] = useState<"online" | "cafe">("online");
  const [customer, setCustomer] = useState({ name: "", phone: "", whatsappOptIn: true, privacyAccepted: false });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<ServiceErrorCode | "network" | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [sheet, setSheet] = useState<GatewayOrder | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const honeypot = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    const result = await ticketing.getOrder(orderId).catch(() => null);
    if (!result?.ok) {
      setLoad({ state: "missing" });
      return null;
    }
    const order = result.value;
    let booking: Booking | null = null;
    if (order.bookingCode) {
      const b = await bookings.getBooking(order.bookingCode);
      booking = b.ok ? b.value : null;
    }
    setLoad({ state: "ready", order, booking });
    return order;
  }, [orderId]);

  useEffect(() => {
    let live = true;
    ticketing.getOrder(orderId).then(async (result) => {
      if (!live) return;
      if (!result.ok) return setLoad({ state: "missing" });
      const order = result.value;
      const b = order.bookingCode ? await bookings.getBooking(order.bookingCode) : null;
      if (live) setLoad({ state: "ready", order, booking: b?.ok ? b.value : null });
    });
    return () => {
      live = false;
    };
  }, [orderId]);

  /** Where a finished order leads: its ticket, or the table booking it paid for. */
  useEffect(() => {
    if (load.state !== "ready") return;
    const { order } = load;
    if ((order.status === "paid" || order.status === "reserved") && order.ticketCode) {
      router.replace(routes.ticket(order.ticketCode));
    } else if (order.status === "paid" && order.bookingCode) {
      router.replace(routes.booking(order.bookingCode));
    }
  }, [load, router]);

  /** A pending payment: check again every few seconds (the webhook settles it). */
  const status = load.state === "ready" ? load.order.status : null;
  useEffect(() => {
    if (status !== "awaiting_payment") return;
    const id = window.setInterval(() => void reload(), 3_000);
    return () => window.clearInterval(id);
  }, [status, reload]);

  useEffect(() => {
    const onDemo = () => void reload();
    window.addEventListener("carbon:demo-changed", onDemo);
    return () => window.removeEventListener("carbon:demo-changed", onDemo);
  }, [reload]);

  if (load.state === "loading") return <p className="text-fg-muted">{t.loading}</p>;
  if (load.state === "missing") {
    return (
      <Panel title={t.notFoundTitle}>
        <p className="text-fg-muted">{t.notFoundBody}</p>
        <ButtonLink href={routes.events} className="self-start">
          {copy.events.back}
        </ButtonLink>
      </Panel>
    );
  }

  const { order, booking } = load;
  const event = events.find((e) => e.slug === order.eventSlug);
  const isDeposit = order.kind === "deposit";
  const amount = isDeposit ? placeholders.depositPriceLabel : placeholders.ticketPriceLabel;
  const title = isDeposit ? t.deposit(order.bookingCode ?? "") : `${event?.title ?? ""} ${t.times(order.quantity)}`;
  const date = new Date(order.startsAt);
  const day = localDate(date, site.timeZone);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: site.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  const where = isDeposit ? (booking ? outletNames[booking.outlet] : "") : event?.outletName;
  const back =
    isDeposit && order.bookingCode
      ? routes.booking(order.bookingCode)
      : event
        ? routes.event(event.slug)
        : routes.events;

  const run = async <T,>(work: () => Promise<T>): Promise<T | null> => {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    try {
      return await work();
    } catch {
      setProblem("network");
      return null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const details = () => ({
    ...customer,
    noticeVersion: placeholders.noticeVersion.value,
    website: honeypot.current?.value ?? "",
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = { method, ...(isDeposit ? {} : { customer: details() }) };
    const result = await run(() => ticketing.checkout(order.id, input, keyFor(input)));
    if (!result) return;
    if (!result.ok) {
      const f = result.error.fields ?? {};
      setFields(Object.fromEntries(Object.entries(f).map(([k, v]) => [k.replace(/^customer\./, ""), v])));
      if (result.error.code === "hold_expired") void reload();
      else if (result.error.code !== "invalid_input") setProblem(result.error.code);
      return;
    }
    setFields({});
    if (result.value.ticket) {
      router.push(routes.ticket(result.value.ticket.code));
      return;
    }
    if (result.value.gateway) {
      setSheet(result.value.gateway);
      setFailed(false);
      setSheetOpen(true);
    }
  };

  const pay = async (outcome: PaymentOutcome) => {
    if (!sheet) return;
    const result = await run(() => gateway.pay(sheet.gatewayOrderId, outcome));
    setSheetOpen(false);
    if (!result) return;
    if (!result.ok) {
      setProblem(result.error.code);
      void reload();
      return;
    }
    if (outcome === "captured" && result.value.signature) {
      const proof = { paymentId: result.value.paymentId, signature: result.value.signature };
      const verified = await run(() => ticketing.verifyPayment(order.id, proof, keyFor({ op: "verify", ...proof })));
      if (verified && !verified.ok) setProblem(verified.error.code);
    }
    setFailed(outcome === "failed");
    void reload();
  };

  const payAtCafeInstead = async () => {
    if (isDeposit && booking) {
      const result = await run(() =>
        bookings.confirm(booking.code, { payment: "cafe" }, keyFor({ op: "confirm", code: booking.code })),
      );
      if (result?.ok) router.push(routes.booking(booking.code));
      else if (result) setProblem(result.error.code);
      return;
    }
    setMethod("cafe");
    setFailed(false);
    const input = { method: "cafe" as const, customer: details() };
    const result = await run(() => ticketing.checkout(order.id, input, keyFor(input)));
    if (result?.ok && result.value.ticket) router.push(routes.ticket(result.value.ticket.code));
    else if (result && !result.ok) setProblem(result.error.code);
  };

  const summary = (
    <div className="flex flex-col gap-1 rounded-md border border-line bg-surface-raised p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-h3 font-semibold">{title}</p>
        <p className="font-mono">
          <Tbc id={amount.id}>{amount.value}</Tbc>
        </p>
      </div>
      <p className="text-fg-muted">
        {whenShort(day, time)}
        {where ? `, ${where}` : ""}
      </p>
      {isDeposit && <p className="text-small text-fg-muted">{t.depositNote}</p>}
    </div>
  );

  const notice = problem && (
    <p role="alert" className="rounded-sm border border-danger p-3">
      {errors[problem]}
    </p>
  );

  if (order.status === "expired") {
    return (
      <Panel title={t.expiredTitle} tone="danger">
        <p className="text-fg-muted">{t.expiredBody}</p>
        <ButtonLink href={back} className="self-start">
          {isDeposit ? t.backToBooking : t.backToEvent}
        </ButtonLink>
      </Panel>
    );
  }
  if (order.status === "refunded") {
    const reason = order.refund?.reason;
    return (
      <Panel title={t.refundedTitle}>
        {reason === "seats_gone" && <p>{t.seatsGone}</p>}
        {reason === "booking_expired" && <p>{t.bookingGone}</p>}
        <p className="text-fg-muted">{t.refundedBody}</p>
        <ButtonLink href={back} className="self-start">
          {isDeposit ? t.backToBooking : t.backToEvent}
        </ButtonLink>
      </Panel>
    );
  }
  if (order.status === "paid" || order.status === "reserved" || order.status === "cancelled") {
    return <p className="text-fg-muted">{t.loading}</p>;
  }

  if (order.status === "awaiting_payment") {
    return (
      <>
        <div className="flex flex-col items-center gap-6 py-6 text-center" role="status">
          <span
            className="size-20 animate-spin rounded-full border-4 border-line border-t-accent motion-reduce:animate-none"
            aria-hidden="true"
          />
          <h1 className="text-h1 font-semibold">{t.pending.title}</h1>
          <p className="max-w-sm text-fg-muted">{t.pending.body}</p>
          <div className="flex max-w-sm flex-col gap-1 rounded-md border border-line bg-surface-raised p-4 text-left">
            <p className="font-semibold">{t.pending.closedTitle}</p>
            <p className="text-small text-fg-muted">{t.pending.closedBody}</p>
          </div>
          <Button variant="secondary" onClick={() => void reload()}>
            {t.pending.check}
          </Button>
        </div>
        {flags.devPanel && order.gatewayOrderId && (
          <DemoPanel>
            <Button
              variant="secondary"
              onClick={() => void gateway.settlePending(order.gatewayOrderId ?? "", "captured", false).then(reload)}
            >
              {t.demo.approve}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void gateway.settlePending(order.gatewayOrderId ?? "", "captured", true).then(reload)}
            >
              {t.demo.approveTwice}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void gateway.settlePending(order.gatewayOrderId ?? "", "failed", false).then(reload)}
            >
              {t.demo.decline}
            </Button>
          </DemoPanel>
        )}
      </>
    );
  }

  const timer = <LiveHold order={order} label={isDeposit ? t.depositHeld : t.held} onExpire={() => void reload()} />;
  const sheetView = (
    <PaymentSheet
      open={sheetOpen}
      description={title}
      amount={amount.value}
      busy={busy}
      onPay={pay}
      onClose={() => setSheetOpen(false)}
    />
  );

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <span
          className="flex size-16 items-center justify-center rounded-full bg-danger text-carbon-black"
          aria-hidden="true"
        >
          <Icon name="close" className="size-8" />
        </span>
        <h1 className="text-h1 font-semibold">{t.failed.title}</h1>
        {timer}
        <p className="max-w-sm text-fg-muted">{t.failed.body}</p>
        {notice}
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button onClick={() => setSheetOpen(true)}>{t.failed.retry}</Button>
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            {t.failed.another}
          </Button>
          <Button variant="secondary" onClick={payAtCafeInstead} disabled={busy}>
            {t.payAtCafeInstead}
          </Button>
        </div>
        {sheetView}
      </div>
    );
  }

  return (
    <>
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <h1 className="text-h1 font-semibold">{t.heading}</h1>
        {timer}
        {summary}
        {notice}
        {!isDeposit && (
          <div className="flex flex-col gap-4">
            <TextField
              label={t.name}
              name="name"
              autoComplete="name"
              value={customer.name}
              error={message(fields.name)}
              onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
            />
            <TextField
              label={t.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={customer.phone}
              error={message(fields.phone)}
              onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
            />
            <div className="flex flex-col gap-1">
              <Checkbox
                label={t.whatsapp}
                checked={customer.whatsappOptIn}
                onChange={(e) => setCustomer((c) => ({ ...c, whatsappOptIn: e.target.checked }))}
              />
              <Checkbox
                label={t.privacy}
                checked={customer.privacyAccepted}
                error={message(fields.privacyAccepted)}
                onChange={(e) => setCustomer((c) => ({ ...c, privacyAccepted: e.target.checked }))}
              />
            </div>
            <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
              <label>
                {copy.booking.details.botLabel}
                <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
              </label>
            </div>
          </div>
        )}
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="label-caps mb-3 text-small text-fg-muted">{t.payLegend}</legend>
          <RadioCard
            name="method"
            value="online"
            checked={method === "online"}
            onChange={() => setMethod("online")}
            title={t.payOnline}
            hint={t.payOnlineHint}
          />
          {!isDeposit && (
            <RadioCard
              name="method"
              value="cafe"
              checked={method === "cafe"}
              onChange={() => setMethod("cafe")}
              title={t.payCafe}
              hint={
                <>
                  {t.payCafeHint}{" "}
                  <Tbc id={placeholders.payAtCafeDeadline.id}>{placeholders.payAtCafeDeadline.value.label}</Tbc>{" "}
                  {t.payCafeHintAfter}
                </>
              }
            />
          )}
        </fieldset>
        <Button type="submit" disabled={busy}>
          {busy ? t.working : method === "online" ? t.pay(amount.value) : t.reserve}
        </Button>
        {isDeposit && (
          <Button variant="quiet" onClick={payAtCafeInstead} disabled={busy} className="self-center">
            {t.payAtCafeInstead}
          </Button>
        )}
      </form>
      {sheetView}
    </>
  );
}

function LiveHold({
  order,
  label,
  onExpire,
}: {
  readonly order: Order;
  readonly label: string;
  readonly onExpire: () => void;
}) {
  const now = useNow(1000);
  if (!now) return null;
  return (
    <HoldTimer
      msLeft={holdMsLeft({ status: "held", holdExpiresAt: order.holdExpiresAt }, now)}
      onExpire={onExpire}
      label={label}
    />
  );
}

function Panel({
  title,
  tone,
  children,
}: {
  readonly title: string;
  readonly tone?: "danger";
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className={tone === "danger" ? "text-h1 font-semibold text-danger" : "text-h1 font-semibold"}>{title}</h1>
      {children}
    </div>
  );
}
