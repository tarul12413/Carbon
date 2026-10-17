"use client";

import Link from "next/link";
import { useDeferredValue, useId, useState } from "react";
import { whenShort } from "@/components/booking/format";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { adminCopy } from "@/content/admin-copy";
import { routes } from "@/config/routes";
import { canDo } from "@/domain/admin/access";
import { downloadText } from "@/lib/download";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { clientServices } from "@/services/client";
import type { Attendee, AttendeeList, EventSales } from "@/services/admin";
import { useAdmin } from "./AdminShell";
import { LoadState, Notice, PageTitle, clockTime, problemText, useLoad } from "./parts";

const t = adminCopy.events;

function Facts({ sales }: { readonly sales: EventSales }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-small text-fg-muted">
      <li className="text-fg">{t.sold(sales.sold, sales.quota)}</li>
      <li>{t.checkedIn(sales.checkedIn)}</li>
      {sales.unpaid > 0 && <li>{t.unpaid(sales.unpaid)}</li>}
      {sales.waiting > 0 && <li>{t.waiting(sales.waiting)}</li>}
    </ul>
  );
}

/** Blueprint section 10, Events: sales and check-ins per event. */
export function AdminEvents() {
  const { actor, scope, outletName } = useAdmin();
  const { result, reload } = useLoad(() => clientServices.admin.listEvents(actor), actor.staffId);
  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t.title}</PageTitle>
      <LoadState result={result} reload={reload}>
        {(events) => {
          const shown = events.filter((e) => scope === "all" || e.event.outlet === scope);
          return shown.length === 0 ? (
            <p className="text-fg-muted">{t.none}</p>
          ) : (
            <ul className="grid gap-3 tablet:grid-cols-2">
              {shown.map((e) => (
                <li
                  key={e.event.slug}
                  className="flex flex-col gap-2 rounded-sm border border-line bg-surface-raised p-4"
                >
                  <h2 className="text-h3 font-semibold">{e.event.title}</h2>
                  <p className="text-fg-muted">
                    {whenShort(e.event.date, e.event.time)} · {outletName(e.event.outlet)}
                  </p>
                  <Facts sales={e} />
                  <Link
                    href={routes.adminEvent(e.event.slug)}
                    className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-accent underline underline-offset-4"
                  >
                    {t.attendees}
                    <Icon name="arrowRight" />
                  </Link>
                </li>
              ))}
            </ul>
          );
        }}
      </LoadState>
    </div>
  );
}

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

function exportCsv(list: AttendeeList) {
  const rows = list.attendees.map((a) => [
    a.code,
    a.name,
    a.phoneMasked,
    a.ticketType,
    a.quantity,
    a.paid ? "yes" : "no",
    a.checkedInAt ?? "",
  ]);
  const text = [t.csv, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  downloadText(`${list.sales.event.slug}-attendees.csv`, text, "text/csv");
}

/** Blueprint section 10: attendee list, payment at the counter, check-in, export. */
export function AdminAttendees({ slug }: { readonly slug: string }) {
  const { actor, staff, outletName } = useAdmin();
  const { result, reload } = useLoad(() => clientServices.admin.attendees(actor, slug), `${actor.staffId}|${slug}`);
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const [message, setMessage] = useState<{ text: string; tone: "done" | "problem" }>({ text: "", tone: "done" });
  const keyFor = useIdempotencyKey();
  const searchId = useId();

  const act = async (a: Attendee, action: "paid" | "checkIn", collected = false) => {
    try {
      const request = { code: a.code, action, collected };
      const out =
        action === "paid"
          ? await clientServices.admin.markPaid(actor, a.code, keyFor(request))
          : await clientServices.admin.checkIn(actor, a.code, collected, keyFor(request));
      if (out.ok) {
        setMessage({ text: `${t.done[action](a.code)} ${adminCopy.logged}`, tone: "done" });
        reload();
      } else setMessage({ text: problemText(out.error), tone: "problem" });
    } catch {
      setMessage({ text: problemText("network"), tone: "problem" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={routes.adminSection("events")}
        className="inline-flex min-h-11 items-center gap-2 self-start font-medium text-accent underline underline-offset-4"
      >
        <Icon name="arrowLeft" />
        {t.back}
      </Link>
      <LoadState result={result} reload={reload}>
        {(list) => {
          const { event } = list.sales;
          const door = canDo(staff, "events.checkIn", event.outlet);
          const shown = list.attendees.filter(
            (a) => !deferred || `${a.name} ${a.phoneMasked} ${a.code}`.toLowerCase().includes(deferred),
          );
          return (
            <div className="flex flex-col gap-6">
              <PageTitle lead={`${whenShort(event.date, event.time)} · ${outletName(event.outlet)}`}>
                {event.title}
              </PageTitle>
              <Facts sales={list.sales} />
              <p className="text-small text-fg-muted">{t.sample(list.sampleSeats)}</p>
              <div className="grid gap-3 tablet:grid-cols-[1fr_auto] tablet:items-end">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={searchId} className="text-small font-medium">
                    {t.search}
                  </label>
                  <input
                    id={searchId}
                    type="search"
                    className={inputClass}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="secondary" disabled={list.attendees.length === 0} onClick={() => exportCsv(list)}>
                    <Icon name="arrowDown" />
                    {t.export}
                  </Button>
                </div>
              </div>
              <p className="-mt-3 text-small text-fg-muted">{t.exportNote}</p>
              <Notice message={message.text} tone={message.tone} />
              {list.attendees.length === 0 ? (
                <p className="text-fg-muted">{t.noAttendees}</p>
              ) : shown.length === 0 ? (
                <p className="text-fg-muted">{t.noMatch}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-line border-y border-line">
                  {shown.map((a) => (
                    <li key={a.code} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="font-medium">
                          {a.name} <span className="font-mono text-small text-fg-muted">{a.code}</span>
                        </p>
                        <p className="text-small text-fg-muted">
                          <span className="font-mono">{a.phoneMasked}</span> · {a.ticketType} · {t.admits(a.quantity)}
                        </p>
                        <p className="flex flex-wrap gap-2 text-small">
                          {!a.valid ? (
                            <span className="text-danger">{t.notValid}</span>
                          ) : (
                            <span className={a.paid ? "text-success" : "text-accent"}>
                              {a.paid ? t.paid : t.unpaidChip}
                            </span>
                          )}
                          {a.checkedInAt && <span>· {t.checkedInAt(clockTime(a.checkedInAt))}</span>}
                        </p>
                      </div>
                      {door && a.valid && !a.checkedInAt && (
                        <div className="flex flex-wrap gap-2">
                          {!a.paid && (
                            <Button variant="secondary" onClick={() => act(a, "paid")}>
                              {t.markPaid}
                            </Button>
                          )}
                          <Button onClick={() => act(a, "checkIn", !a.paid)}>
                            {a.paid ? t.checkIn : t.collectCheckIn}
                          </Button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        }}
      </LoadState>
    </div>
  );
}
