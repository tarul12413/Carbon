"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { whenShort } from "@/components/booking/format";
import { adminCopy } from "@/content/admin-copy";
import { routes } from "@/config/routes";
import { formatClock } from "@/domain/hours";
import { longDay } from "@/domain/time";
import { clientServices } from "@/services/client";
import type { Dashboard, SlotLoad } from "@/services/admin";
import { useAdmin } from "./AdminShell";
import { LoadState, PageTitle, StatusChip, useLoad } from "./parts";

const t = adminCopy.dashboard;

function Tile({
  label,
  value,
  hint,
  href,
}: {
  readonly label: string;
  readonly value: number;
  readonly hint?: ReactNode;
  readonly href?: string;
}) {
  const body = (
    <>
      <span className="text-small text-fg-muted">{label}</span>
      <span className="font-mono text-h1 font-medium">{value}</span>
      {hint && <span className="text-small text-fg-muted">{hint}</span>}
    </>
  );
  const box = "flex h-full flex-col gap-1 rounded-sm border border-line bg-surface-raised p-4";
  return (
    <li>
      {href ? (
        <Link href={href} className={`${box} hover-fine:border-accent`}>
          {body}
        </Link>
      ) : (
        <div className={box}>{body}</div>
      )}
    </li>
  );
}

/** One row per slot: a thin bar of seats taken against the slot's capacity, with the numbers as text. */
function Slots({ slots }: { readonly slots: readonly SlotLoad[] }) {
  if (slots.length === 0) return <p className="text-fg-muted">{t.slotsClosed}</p>;
  return (
    <ul className="grid gap-x-8 gap-y-1.5 tablet:grid-cols-2">
      {slots.map((s) => {
        const share = s.capacity > 0 ? Math.min(1, s.taken / s.capacity) : 0;
        return (
          <li key={s.time} className="grid grid-cols-[4.5rem_1fr_4.5rem] items-center gap-3 text-small">
            <span className="font-mono">{formatClock(s.time)}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${share * 100}%` }} />
            </span>
            <span className="text-right font-mono text-fg-muted">{t.slot(s.taken, s.capacity)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function View({ d }: { readonly d: Dashboard }) {
  const { outletName } = useAdmin();
  return (
    <div className="flex flex-col gap-10">
      <ul className="grid grid-cols-2 gap-3 laptop:grid-cols-4">
        {d.tables && <Tile label={t.covers} value={d.tables.covers} hint={t.coversHint} />}
        {d.tables && d.tables.requests !== null && (
          <Tile label={t.requests} value={d.tables.requests} href={routes.adminSection("bookings")} />
        )}
        <Tile label={t.checkIns} value={d.checkIns} hint={t.checkInsHint} />
        {d.onlinePayments !== null && <Tile label={t.payments} value={d.onlinePayments} hint={t.paymentsHint} />}
        {d.wall && (
          <Tile
            label={t.wall}
            value={d.wall.waiting}
            hint={t.reported(d.wall.reported)}
            href={routes.adminSection("wall")}
          />
        )}
        {d.newEnquiries !== null && (
          <Tile label={t.enquiries} value={d.newEnquiries} href={routes.adminSection("enquiries")} />
        )}
      </ul>

      {d.tables && (
        <section aria-labelledby="today-bookings" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="today-bookings" className="text-h3 font-semibold">
              {t.todayTitle}
            </h2>
            <Link href={routes.adminSection("bookings")} className="min-h-11 font-medium text-accent underline">
              {t.seeBookings}
            </Link>
          </div>
          {d.tables.today.length === 0 ? (
            <p className="text-fg-muted">{t.noneToday}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line border-y border-line">
              {d.tables.today.map((b) => (
                <li key={b.code} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="w-20 font-mono">{formatClock(b.time)}</span>
                  <span className="min-w-0 flex-1">
                    {b.name} · {adminCopy.bookings.guests(b.partySize)}
                    {d.scope === "all" && <span className="text-fg-muted"> · {outletName(b.outlet)}</span>}
                  </span>
                  <StatusChip status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {d.tables && (
        <section aria-labelledby="slots" className="flex flex-col gap-4">
          <h2 id="slots" className="text-h3 font-semibold">
            {t.slotsTitle}
          </h2>
          {d.tables.slots ? <Slots slots={d.tables.slots} /> : <p className="text-fg-muted">{t.slotsHint}</p>}
        </section>
      )}

      {d.events && (
        <section aria-labelledby="coming-up" className="flex flex-col gap-4">
          <h2 id="coming-up" className="text-h3 font-semibold">
            {t.eventsTitle}
          </h2>
          {d.events.length === 0 ? (
            <p className="text-fg-muted">{t.noEvents}</p>
          ) : (
            <ul className="grid gap-3 tablet:grid-cols-2 laptop:grid-cols-3">
              {d.events.map((e) => (
                <li key={e.event.slug}>
                  <Link
                    href={routes.adminEvent(e.event.slug)}
                    className="flex h-full flex-col gap-1 rounded-sm border border-line p-4 hover-fine:border-accent"
                  >
                    <span className="font-medium">{e.event.title}</span>
                    <span className="text-small text-fg-muted">
                      {whenShort(e.event.date, e.event.time)} · {outletName(e.event.outlet)}
                    </span>
                    <span className="font-mono text-small">{t.sold(e.sold, e.quota)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

/** Blueprint 5.7, Dashboard: today at a glance, for the outlets this account sees. */
export function AdminDashboard() {
  const { actor, scope } = useAdmin();
  const { result, reload } = useLoad(() => clientServices.admin.dashboard(actor, scope), `${actor.staffId}|${scope}`);
  return (
    <div className="flex flex-col gap-8">
      <PageTitle lead={result && result !== "network" && result.ok ? longDay(result.value.date) : undefined}>
        {t.title}
      </PageTitle>
      <LoadState result={result} reload={reload}>
        {(d) => <View d={d} />}
      </LoadState>
    </div>
  );
}
