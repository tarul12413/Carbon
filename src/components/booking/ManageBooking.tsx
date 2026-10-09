"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, ButtonLink, buttonClass } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { bookableDates } from "@/domain/booking/availability";
import { holdMsLeft } from "@/domain/booking/hold";
import { bookingIcs } from "@/domain/booking/ics";
import { maskIndianMobile } from "@/domain/booking/phone";
import { canChangeOrCancel } from "@/domain/booking/rules";
import type { Booking } from "@/domain/booking/schema";
import type { BookingSettings } from "@/domain/booking/settings";
import type { OutletSlug } from "@/domain/outlet";
import { mapsHref } from "@/lib/maps";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import type { BookingErrorCode } from "@/services/bookings";
import { clientServices } from "@/services/client";
import type { BookingOutlet } from "./BookingFlow";
import { SummaryList } from "./BookingSummary";
import { whenLong, whenShort } from "./format";
import { SlotPicker } from "./SlotPicker";

const t = copy.booking;
const m = t.manage;
const service = clientServices.bookings;

interface ManageBookingProps {
  readonly code: string;
  readonly outlets: readonly BookingOutlet[];
  readonly settings: Readonly<Record<OutletSlug, BookingSettings>>;
}

type Load =
  | { readonly state: "loading" }
  | { readonly state: "missing" }
  | { readonly state: "ready"; readonly booking: Booking };

/**
 * Step six (confirmation) and the manage page, by booking code (Brief: /book/[code]).
 * Bookings live in this browser in the hosted demo, so this page loads on the client.
 */
export function ManageBooking({ code, outlets, settings }: ManageBookingProps) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [mode, setMode] = useState<"view" | "change" | "cancel">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<BookingErrorCode | "network" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pick, setPick] = useState<{ date: string; time: string | undefined } | null>(null);
  const [whatsapp, setWhatsapp] = useState(false);
  const keyFor = useIdempotencyKey();
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    let live = true;
    service
      .getBooking(code)
      .then((result) => live && setLoad(result.ok ? { state: "ready", booking: result.value } : { state: "missing" }))
      .catch(() => live && setLoad({ state: "missing" }));
    return () => {
      live = false;
    };
  }, [code]);

  if (load.state === "loading") return <p className="text-fg-muted">{m.loading}</p>;
  if (load.state === "missing") {
    return (
      <Section title={m.notFoundTitle} code={code}>
        <p className="max-w-prose text-fg-muted">{m.notFoundBody}</p>
        <ButtonLink href={routes.book} className="self-start">
          {m.bookAgain}
        </ButtonLink>
      </Section>
    );
  }

  const booking = load.booking;
  const outlet = outlets.find((o) => o.slug === booking.outlet);
  const outletSettings = settings[booking.outlet];
  const now = new Date();
  const changeable = canChangeOrCancel(booking, now, outletSettings);
  const when = whenLong(booking.date, booking.time);

  const act = async (work: () => ReturnType<typeof service.cancel>, done: (b: Booking) => string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await work();
      if (result.ok) {
        setLoad({ state: "ready", booking: result.value });
        setMode("view");
        setNotice(done(result.value));
        heading.current?.focus();
      } else setError(result.error.code);
    } catch {
      setError("network");
    } finally {
      setBusy(false);
    }
  };

  const downloadIcs = () => {
    const ics = bookingIcs(booking, {
      outletName: outlet?.name ?? "",
      address: outlet?.addressTbc ? "" : (outlet?.address ?? ""),
      dwellMinutes: outletSettings.dwellMinutes,
      now: new Date(),
    });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `carbon-${booking.code}.ics` });
    link.click();
    URL.revokeObjectURL(url);
  };

  const rows = [
    [t.review.outlet, outlet?.name ?? booking.outlet],
    [t.review.when, when],
    [t.review.party, String(booking.partySize)],
    [t.review.name, booking.name],
    [t.review.phone, maskIndianMobile(booking.phone)],
    ...(booking.status === "confirmed" ? [[m.payment, m.payAtCafe] as const] : []),
  ] as const;

  const titles: Record<Booking["status"], string> = {
    held: m.heldTitle,
    requested: m.requestedTitle,
    confirmed: m.confirmedTitle,
    expired: m.expiredTitle,
    declined: m.declinedTitle,
    cancelled: m.cancelledTitle,
    completed: m.completedTitle,
    no_show: m.noShowTitle,
  };

  return (
    <Section title={titles[booking.status]} code={booking.code} headingRef={heading} status={booking.status}>
      <p role="status" className={notice ? "text-success" : "sr-only"}>
        {notice}
      </p>

      <div className="flex flex-col items-center gap-2 rounded-sm border border-line bg-surface-raised p-6 text-center">
        <p className="font-mono text-h2 font-medium text-accent">{booking.code}</p>
        <p className="text-h3">{outlet?.name}</p>
        <p className="text-fg-muted">
          {whenShort(booking.date, booking.time)}, {m.party(booking.partySize)}
        </p>
      </div>

      {booking.status === "requested" && (
        <p className="text-fg-muted">
          {m.requestedBody} <Tbc id={placeholders.groupReplyTimeLabel.id}>{placeholders.groupReplyTimeLabel.value}</Tbc>
          .
        </p>
      )}
      {booking.status === "held" && holdMsLeft(booking, now) > 0 && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-fg-muted">{m.heldBody}</p>
          <ButtonLink href={`${routes.book}?resume=${booking.code}`}>{m.finish}</ButtonLink>
        </div>
      )}
      {booking.status === "cancelled" && <p className="text-fg-muted">{m.cancelledBody}</p>}

      <SummaryList rows={rows} />

      {booking.status === "confirmed" && mode === "view" && (
        <div className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
          <Button variant="secondary" onClick={downloadIcs}>
            <Icon name="calendar" />
            {m.calendar}
          </Button>
          <Button variant="secondary" onClick={() => setWhatsapp((v) => !v)} aria-expanded={whatsapp}>
            <Icon name="chat" />
            {m.whatsapp}
          </Button>
          {outlet && !outlet.addressTbc ? (
            <a href={mapsHref(outlet)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
              <Icon name="pin" />
              {m.directions}
            </a>
          ) : (
            <p className="self-center text-small text-fg-muted">{m.directionsTbc}</p>
          )}
        </div>
      )}
      {whatsapp && booking.status === "confirmed" && (
        <div className="flex flex-col gap-2 rounded-sm border border-dashed border-line-strong p-4">
          <p className="text-small text-fg-muted">{m.whatsappSample}</p>
          <p className="font-mono text-small">
            {m.whatsappMessage(
              booking.code,
              outlet?.name ?? "",
              whenShort(booking.date, booking.time),
              booking.partySize,
            )}
          </p>
        </div>
      )}

      {booking.status === "confirmed" && (
        <section aria-labelledby="change-title" className="flex flex-col gap-4 border-t border-line pt-6">
          <h2 id="change-title" className="text-h3 font-semibold">
            {m.changeOrCancel}
          </h2>
          <p className="text-fg-muted">
            {changeable ? (
              <>
                {m.window}{" "}
                <Tbc id={placeholders.cancellationWindow.id}>{placeholders.cancellationWindow.value.label}</Tbc>{" "}
                {m.windowAfter}
              </>
            ) : (
              m.tooLate
            )}
          </p>
          {error && (
            <p role="alert" className="text-danger">
              {t.errors[error]}
            </p>
          )}

          {changeable && mode === "view" && (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setPick({ date: booking.date, time: booking.time });
                  setMode("change");
                }}
              >
                {m.change}
              </Button>
              <Button variant="quiet" onClick={() => setMode("cancel")}>
                {m.cancel}
              </Button>
            </div>
          )}

          {changeable && mode === "change" && pick && (
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold">{m.changeTitle}</h3>
              <SlotPicker
                service={service}
                outlet={booking.outlet}
                partySize={booking.partySize}
                dates={bookableDates(now, site.timeZone, outletSettings)}
                date={pick.date}
                time={pick.time}
                excludeCode={booking.code}
                onChange={setPick}
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy || !pick.time || (pick.date === booking.date && pick.time === booking.time)}
                  onClick={() => {
                    const input = { date: pick.date, time: pick.time ?? "" };
                    void act(
                      () => service.change(booking.code, input, keyFor({ op: "change", code: booking.code, input })),
                      (b) => m.moved(whenLong(b.date, b.time)),
                    );
                  }}
                >
                  {m.changeSubmit}
                </Button>
                <Button variant="quiet" onClick={() => setMode("view")}>
                  {m.cancelNo}
                </Button>
              </div>
            </div>
          )}

          {changeable && mode === "cancel" && (
            <div
              role="alertdialog"
              aria-labelledby="cancel-ask"
              className="flex flex-col gap-4 rounded-sm border border-danger p-4"
            >
              <p id="cancel-ask">{m.cancelAsk(booking.code)}</p>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy}
                  autoFocus
                  onClick={() =>
                    void act(
                      () => service.cancel(booking.code, keyFor({ op: "cancel", code: booking.code })),
                      () => m.cancelledTitle,
                    )
                  }
                >
                  {m.cancelYes}
                </Button>
                <Button variant="secondary" onClick={() => setMode("view")}>
                  {m.cancelNo}
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {booking.status !== "confirmed" && booking.status !== "requested" && booking.status !== "held" && (
        <ButtonLink href={outlet ? routes.bookAt(outlet.slug) : routes.book} className="self-start">
          {m.bookAgain}
        </ButtonLink>
      )}
    </Section>
  );
}

function Section({
  title,
  code,
  status,
  headingRef,
  children,
}: {
  readonly title: string;
  readonly code: string;
  readonly status?: Booking["status"];
  readonly headingRef?: React.Ref<HTMLHeadingElement>;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="label-caps text-small text-fg-muted">{m.title(code)}</p>
        {status === "confirmed" && (
          <span
            className="flex size-16 items-center justify-center rounded-full bg-success text-on-accent"
            aria-hidden="true"
          >
            <Icon name="check" className="size-8" />
          </span>
        )}
        <h1 ref={headingRef} tabIndex={-1} className="text-display font-semibold text-balance outline-none">
          {title}
        </h1>
      </div>
      {children}
    </div>
  );
}
