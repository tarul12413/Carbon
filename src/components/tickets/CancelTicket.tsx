"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { whenShort } from "@/components/booking/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { useNow } from "@/lib/useNow";
import { clientServices } from "@/services/client";
import type { ServiceErrorCode } from "@/services/errors";
import { jaipurParts, useTicket, type TicketEvent } from "./TicketView";

const t = copy.cancel;

/** /tickets/[code]/cancel: the rule, the refund, and a deliberate confirm (wireframe 08, screen 6). */
export function CancelTicket({ code, events }: { readonly code: string; readonly events: readonly TicketEvent[] }) {
  const router = useRouter();
  const load = useTicket(code);
  const keyFor = useIdempotencyKey();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<ServiceErrorCode | "network" | null>(null);
  const now = useNow(60_000);

  if (load.state === "loading") return <p className="text-fg-muted">{copy.ticket.loading}</p>;
  if (load.state === "missing") {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-h1 font-semibold">{copy.ticket.notFoundTitle}</h1>
        <p className="text-fg-muted">{copy.ticket.notFoundBody}</p>
      </div>
    );
  }

  const { ticket, order } = load.data;
  const event = events.find((e) => e.slug === ticket.eventSlug);
  const { date, time } = jaipurParts(order.startsAt);
  const paid = order.status === "paid";
  const windowMs = placeholders.cancellationWindow.value.demoHours * 60 * 60_000;
  const tooLate = now !== null && Date.parse(order.startsAt) - now.getTime() < windowMs;
  const cancellable = ticket.status === "valid" && (paid || order.status === "reserved");

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const result = await clientServices.ticketing.cancelTicket(code, keyFor({ op: "cancel", code }));
      if (result.ok) {
        router.push(routes.ticket(code));
        return;
      }
      setProblem(result.error.code);
    } catch {
      setProblem("network");
    }
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 font-semibold">{t.title}</h1>
      <div className="flex flex-col gap-1 rounded-md border border-line bg-surface-raised p-5">
        <p className="text-h3 font-semibold">
          {event?.title} x {ticket.quantity}
        </p>
        <p className="font-mono text-accent">{ticket.code}</p>
        <p className="text-fg-muted">{whenShort(date, time)}</p>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-line-strong p-5">
        <p className="font-semibold">{t.rule}</p>
        <p className="text-fg-muted">
          {t.free} <Tbc id={placeholders.cancellationWindow.id}>{placeholders.cancellationWindow.value.label}</Tbc>{" "}
          {t.freeAfter}
        </p>
        {paid ? (
          <p>
            {t.refund} <Tbc id={placeholders.ticketPriceLabel.id}>{placeholders.ticketPriceLabel.value}</Tbc>{" "}
            {t.refundTo}
          </p>
        ) : (
          <p>{t.noRefund}</p>
        )}
      </div>
      {paid && <p className="text-fg-muted">{t.timing}</p>}
      {problem && (
        <p role="alert" className="rounded-sm border border-danger p-3">
          {copy.booking.errors[problem]}
        </p>
      )}
      {cancellable && tooLate && <p className="text-fg-muted">{t.tooLate}</p>}
      <div className="flex flex-col gap-3">
        {cancellable && !tooLate && (
          <Button onClick={confirm} disabled={busy} className="bg-danger text-carbon-black">
            {t.confirm}
          </Button>
        )}
        <ButtonLink href={routes.ticket(code)} variant="secondary">
          {t.keep}
        </ButtonLink>
      </div>
    </div>
  );
}
