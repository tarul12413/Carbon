"use client";

import { useEffect, useState, type ReactNode } from "react";
import { whenLong, whenShort } from "@/components/booking/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { calendarFile } from "@/domain/booking/ics";
import type { Order } from "@/domain/orders/schema";
import { localDate } from "@/domain/time";
import { downloadText } from "@/lib/download";
import { clientServices } from "@/services/client";
import type { TicketView as TicketData } from "@/services/ticketing";
import { TicketQr } from "./TicketQr";

const t = copy.ticket;

export interface TicketEvent {
  readonly slug: string;
  readonly title: string;
  readonly outletName: string;
  readonly address: string;
  readonly durationMinutes: number;
}

type Load =
  | { readonly state: "loading" }
  | { readonly state: "missing" }
  | { readonly state: "ready"; readonly data: TicketData };

/** Local date and "HH:MM" in Jaipur for an instant. */
export function jaipurParts(iso: string): { date: string; time: string } {
  const at = new Date(iso);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: site.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(at);
  return { date: localDate(at, site.timeZone), time };
}

export function useTicket(code: string): Load {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  useEffect(() => {
    let live = true;
    clientServices.ticketing
      .getTicket(code)
      .then((result) => live && setLoad(result.ok ? { state: "ready", data: result.value } : { state: "missing" }))
      .catch(() => live && setLoad({ state: "missing" }));
    return () => {
      live = false;
    };
  }, [code]);
  return load;
}

const titles: Partial<Record<Order["status"], string>> = {
  paid: t.inTitle,
  reserved: t.reservedTitle,
  refunded: t.refundedTitle,
  cancelled: t.cancelledTitle,
  expired: t.expiredTitle,
};

/** /tickets/[code]: the signed QR and what to do with it (wireframe 07, screen 3). */
export function TicketView({ code, events }: { readonly code: string; readonly events: readonly TicketEvent[] }) {
  const load = useTicket(code);
  const [shared, setShared] = useState(false);

  if (load.state === "loading") return <p className="text-fg-muted">{t.loading}</p>;
  if (load.state === "missing") {
    return (
      <Frame title={t.notFoundTitle}>
        <p className="text-fg-muted">{t.notFoundBody}</p>
        <ButtonLink href={routes.events} className="self-start">
          {copy.events.back}
        </ButtonLink>
      </Frame>
    );
  }

  const { ticket, order } = load.data;
  const event = events.find((e) => e.slug === ticket.eventSlug);
  const { date, time } = jaipurParts(order.startsAt);
  const valid = ticket.status === "valid";
  const price = placeholders.ticketPriceLabel;

  const addToCalendar = () => {
    const file = calendarFile({
      uid: ticket.code,
      startsAt: order.startsAt,
      endsAt: new Date(Date.parse(order.startsAt) + (event?.durationMinutes ?? 120) * 60_000).toISOString(),
      summary: `${event?.title ?? "Carbon"} x ${ticket.quantity}`,
      location: event?.address ?? "",
      description: `Ticket ${ticket.code}`,
      now: new Date(),
    });
    downloadText(`carbon-${ticket.code}.ics`, file, "text/calendar");
  };

  const share = async () => {
    const url = new URL(routes.event(ticket.eventSlug), window.location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: event?.title ?? "Carbon", url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      /* Sharing was dismissed. */
    }
  };

  return (
    <Frame title={titles[order.status] ?? t.inTitle} confirmed={valid && order.status === "paid"}>
      {valid && (
        <div className="flex flex-col items-center gap-3">
          <TicketQr value={ticket.token} label={t.qrLabel(ticket.code, ticket.quantity)} />
          <p className="max-w-64 text-center text-small text-fg-muted">{t.sampleQr}</p>
        </div>
      )}
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="font-mono text-h2 font-medium text-accent">{ticket.code}</p>
        <p className="text-h3">
          {event?.title} x {ticket.quantity}
        </p>
        <p className="text-fg-muted">
          {whenShort(date, time)}, {event?.outletName}
        </p>
        <p className="font-mono text-small text-fg-muted">{t.admits(ticket.quantity)}</p>
      </div>

      {order.status === "reserved" && order.cafeDeadline && (
        <div className="flex flex-col gap-1 rounded-md border border-accent p-4">
          <p>
            {t.payBy} <Tbc id={price.id}>{price.value}</Tbc>
          </p>
          <p className="text-small text-fg-muted">
            {t.payByDeadline}{" "}
            <Tbc id={placeholders.payAtCafeDeadline.id}>
              {whenLong(jaipurParts(order.cafeDeadline).date, jaipurParts(order.cafeDeadline).time)}
            </Tbc>
            .
          </p>
        </div>
      )}
      {order.status === "refunded" && <p className="text-fg-muted">{copy.cancel.doneRefund}</p>}
      {order.status === "expired" && <p className="text-fg-muted">{t.expiredBody}</p>}

      {valid && (
        <div className="flex flex-col gap-3">
          <Button variant="secondary" onClick={addToCalendar}>
            <Icon name="calendar" />
            {t.calendar}
          </Button>
          <Button variant="secondary" onClick={share}>
            <Icon name="arrowRight" />
            {t.share}
          </Button>
          <p role="status" className={shared ? "text-center text-small text-success" : "sr-only"}>
            {shared ? t.shared : ""}
          </p>
          <ButtonLink href={routes.ticketCancel(ticket.code)} variant="quiet" className="self-center">
            {t.cancel}
          </ButtonLink>
        </div>
      )}
      {!valid && (
        <ButtonLink href={routes.event(ticket.eventSlug)} className="self-center">
          {copy.checkout.backToEvent}
        </ButtonLink>
      )}
    </Frame>
  );
}

function Frame({
  title,
  confirmed,
  children,
}: {
  readonly title: string;
  readonly confirmed?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 text-center">
        {confirmed && (
          <span
            className="flex size-16 items-center justify-center rounded-full bg-success text-on-accent"
            aria-hidden="true"
          >
            <Icon name="check" className="size-8" />
          </span>
        )}
        <h1 className="text-display font-semibold text-balance">{title}</h1>
      </div>
      {children}
    </div>
  );
}
