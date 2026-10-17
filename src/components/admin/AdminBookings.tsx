"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, inputClass } from "@/components/ui/Field";
import { adminCopy } from "@/content/admin-copy";
import { site } from "@/config/site";
import { canDo } from "@/domain/admin/access";
import type { BookingDecision } from "@/domain/admin/schema";
import { ADMIN_LIMITS } from "@/domain/admin/limits";
import { formatClock } from "@/domain/hours";
import { localDate, longDay } from "@/domain/time";
import { cx } from "@/lib/cx";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { useNow } from "@/lib/useNow";
import { clientServices } from "@/services/client";
import type { BookingRow } from "@/services/admin";
import { useAdmin } from "./AdminShell";
import { LoadState, Notice, PageTitle, StatusChip, problemText, useLoad } from "./parts";

const t = adminCopy.bookings;
type View = "requests" | "day";
type Action = BookingDecision["action"];

/** Blueprint section 10, Bookings: approve or decline requests, notes, seated and no-show. */
export function AdminBookings() {
  const { actor, staff, scope } = useAdmin();
  const now = useNow(30_000);
  const today = now ? localDate(now, site.timeZone) : "";
  const decides = canDo(staff, "booking.decide");
  const [view, setView] = useState<View>(decides ? "requests" : "day");
  const [picked, setPicked] = useState("");
  const date = picked || today;
  const [message, setMessage] = useState<{ text: string; tone: "done" | "problem" }>({ text: "", tone: "done" });
  const keyFor = useIdempotencyKey();
  const dateId = useId();
  const day = staff.role === "barista" ? today : date;

  const { result, reload } = useLoad(
    () =>
      clientServices.admin.listBookings(
        actor,
        view === "requests" ? { view, outlet: scope } : { view, outlet: scope, date: day },
      ),
    `${actor.staffId}|${scope}|${view}|${day}`,
  );

  const act = async (row: BookingRow, decision: BookingDecision) => {
    try {
      const done = await clientServices.admin.decideBooking(
        actor,
        row.booking.code,
        decision,
        keyFor({ code: row.booking.code, ...decision }),
      );
      if (done.ok) {
        setMessage({ text: `${t.done[decision.action](row.booking.code)} ${adminCopy.logged}`, tone: "done" });
        reload();
      } else setMessage({ text: problemText(done.error), tone: "problem" });
    } catch {
      setMessage({ text: problemText("network"), tone: "problem" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t.title}</PageTitle>
      <div className="flex flex-wrap items-end gap-4">
        {decides && (
          <div
            role="group"
            aria-label={t.viewLabel}
            className="grid grid-cols-2 gap-1 rounded-sm border border-line p-1"
          >
            {(["requests", "day"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={cx(
                  "min-h-11 rounded-sm px-4 font-medium",
                  view === v ? "bg-accent text-on-accent" : "text-fg-muted hover-fine:text-fg",
                )}
              >
                {t.views[v]}
              </button>
            ))}
          </div>
        )}
        {view === "day" &&
          (staff.role === "barista" ? (
            <p className="text-fg-muted">
              {longDay(today)}. {t.todayOnly}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={dateId} className="text-small font-medium">
                {t.date}
              </label>
              <input
                id={dateId}
                type="date"
                className={cx(inputClass, "w-auto")}
                value={date}
                onChange={(e) => e.target.value && setPicked(e.target.value)}
              />
            </div>
          ))}
      </div>
      <Notice message={message.text} tone={message.tone} />
      <LoadState result={result} reload={reload}>
        {(rows) =>
          rows.length === 0 ? (
            <p className="text-fg-muted">{view === "requests" ? t.noRequests : t.noBookings}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <BookingCard key={row.booking.code} row={row} now={now} today={today} onAct={(d) => act(row, d)} />
              ))}
            </ul>
          )
        }
      </LoadState>
    </div>
  );
}

function BookingCard({
  row,
  now,
  today,
  onAct,
}: {
  readonly row: BookingRow;
  readonly now: Date | null;
  readonly today: string;
  readonly onAct: (decision: BookingDecision) => Promise<void>;
}) {
  const { staff, scope, outletName } = useAdmin();
  const { booking } = row;
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState(booking.staffNote ?? "");
  const outlet = booking.outlet;
  const run =
    (action: Action, extra: { note?: string } = {}) =>
    async () => {
      setBusy(true);
      await onAct({ action, ...extra });
      setBusy(false);
      setConfirming(false);
    };
  const requested = booking.status === "requested" && canDo(staff, "booking.decide", outlet);
  const onTheDay = booking.status === "confirmed" && booking.date === today && canDo(staff, "booking.arrive", outlet);
  const started = now !== null && Date.parse(booking.startsAt) <= now.getTime();
  const notes = canDo(staff, "booking.note", outlet);

  return (
    <li className="flex flex-col gap-3 rounded-sm border border-line bg-surface-raised p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-mono">{booking.code}</span>
        <StatusChip status={booking.status} />
        <span className="text-fg-muted">
          {longDay(booking.date)}, {formatClock(booking.time)}
          {scope === "all" && ` · ${outletName(outlet)}`}
        </span>
      </div>
      <p className="text-h3 font-medium">
        {booking.name} · {t.guests(booking.partySize)}
      </p>
      <dl className="grid gap-x-6 gap-y-1 text-small tablet:grid-cols-[auto_1fr]">
        <dt className="text-fg-muted">{t.phone}</dt>
        <dd className="font-mono">{booking.phone}</dd>
        {booking.request && (
          <>
            <dt className="text-fg-muted">{t.occasion}</dt>
            <dd>{booking.request.occasion}</dd>
            {booking.request.budgetPerHead && (
              <>
                <dt className="text-fg-muted">{t.budget}</dt>
                <dd>{booking.request.budgetPerHead}</dd>
              </>
            )}
          </>
        )}
      </dl>
      {booking.note && <p className="text-small italic">“{booking.note}”</p>}
      {booking.status === "requested" && (
        <p className={cx("text-small", row.seatsLeft < booking.partySize ? "text-danger" : "text-fg-muted")}>
          {t.seatsLeft(row.seatsLeft)}
          {row.seatsLeft < booking.partySize && `. ${t.overCapacity}`}
        </p>
      )}

      {requested &&
        (confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-medium">{t.declineConfirm}</p>
            <Button disabled={busy} onClick={run("decline", note.trim() ? { note } : {})}>
              {t.declineYes}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(false)}>
              {t.keep}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={run("approve", note.trim() ? { note } : {})}>
              {t.approve}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setConfirming(true)}>
              {t.decline}
            </Button>
          </div>
        ))}
      {onTheDay && (
        <div className="flex flex-wrap gap-3">
          <Button disabled={busy} onClick={run("seat")}>
            {t.seat}
          </Button>
          {started && (
            <Button variant="secondary" disabled={busy} onClick={run("no_show")}>
              {t.noShow}
            </Button>
          )}
        </div>
      )}
      {notes ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run("note", { note })();
          }}
        >
          <TextArea
            label={t.note}
            hint={t.noteHint}
            value={note}
            maxLength={ADMIN_LIMITS.staffNote}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button
            type="submit"
            variant="quiet"
            disabled={busy || note === (booking.staffNote ?? "")}
            className="self-start"
          >
            {t.saveNote}
          </Button>
        </form>
      ) : (
        booking.staffNote && (
          <p className="text-small">
            <span className="text-fg-muted">{t.note}: </span>
            {booking.staffNote}
          </p>
        )
      )}
    </li>
  );
}
