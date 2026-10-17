"use client";

import { useEffect, useState } from "react";
import { copy } from "@/content/copy";
import { isBookable, type Slot } from "@/domain/booking/availability";
import { formatClock } from "@/domain/hours";
import type { OutletSlug } from "@/domain/outlet";
import { shortDay } from "@/domain/time";
import { cx } from "@/lib/cx";
import type { Availability, BookingResult, BookingService } from "@/services/bookings";

const t = copy.booking;

interface SlotPickerProps {
  readonly service: BookingService;
  readonly outlet: OutletSlug;
  readonly partySize: number;
  readonly dates: readonly string[];
  readonly date: string | undefined;
  readonly time: string | undefined;
  readonly onChange: (next: { date: string; time: string | undefined }) => void;
  /** Code of the booking being moved: its own seats do not count. */
  readonly excludeCode?: string;
  /** Bump to fetch again, e.g. after someone else took the slot. */
  readonly refresh?: number;
}

/** "7 PM, full": the strike-through is visual only, so the state goes in the name. */
const slotName = (slot: Slot) =>
  slot.state === "full"
    ? `${formatClock(slot.time)}, ${t.slotFull}`
    : slot.state === "low"
      ? `${formatClock(slot.time)}, ${t.slotLow}`
      : formatClock(slot.time);

const dayLabel = (date: string, index: number) => (index === 0 ? t.today : index === 1 ? t.tomorrow : shortDay(date));

export function SlotPicker({
  service,
  outlet,
  partySize,
  dates,
  date,
  time,
  onChange,
  excludeCode,
  refresh = 0,
}: SlotPickerProps) {
  const day = date ?? dates[0] ?? "";
  const key = `${outlet}|${day}|${partySize}|${refresh}`;
  const [result, setResult] = useState<{ key: string; data: BookingResult<Availability> | "network" } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    service
      .getAvailability({ outlet, date: day, partySize, ...(excludeCode ? { excludeCode } : {}) })
      .then((data) => live && setResult({ key, data }))
      .catch(() => live && setResult({ key, data: "network" }));
    return () => {
      live = false;
    };
  }, [service, outlet, day, partySize, excludeCode, key, attempt]);

  const loading = result?.key !== key;
  const data = loading ? null : result.data;
  const slots: readonly Slot[] = data && data !== "network" && data.ok ? data.value.slots : [];
  const visible = slots.filter((s) => s.state !== "past");
  const failed = data === "network" || (data !== null && !data.ok);
  const nothingLeft = !loading && !failed && !visible.some(isBookable);
  const closed = data !== null && data !== "network" && data.ok && data.value.closed === true;
  const nextDay = dates[dates.indexOf(day) + 1];
  const full = visible.filter((s) => s.state === "full").map((s) => formatClock(s.time));
  const low = visible.filter((s) => s.state === "low");

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex min-w-0 flex-col gap-3">
        <legend className="label-caps mb-3 text-small text-fg-muted">{t.dateLegend}</legend>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {dates.map((d, i) => (
            <label key={d} className="relative shrink-0">
              <input
                type="radio"
                name="booking-date"
                value={d}
                checked={d === day}
                onChange={() => onChange({ date: d, time: undefined })}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-4 font-medium whitespace-nowrap peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring)">
                {dayLabel(d, i)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex min-w-0 flex-col gap-3" aria-busy={loading}>
        <legend className="label-caps mb-3 text-small text-fg-muted">{t.timeLegend}</legend>
        {loading && <p className="text-fg-muted">{t.loadingSlots}</p>}
        {failed && (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-danger">{t.slotsError}</p>
            <button
              type="button"
              className="min-h-11 font-medium text-accent underline"
              onClick={() => setAttempt((n) => n + 1)}
            >
              {t.retry}
            </button>
          </div>
        )}
        {!loading && !failed && (
          <div className="grid grid-cols-3 gap-2 phone:grid-cols-4 laptop:grid-cols-6">
            {visible.map((slot) => {
              const bookable = isBookable(slot);
              return (
                <label key={slot.time} className="relative">
                  <input
                    type="radio"
                    name="booking-time"
                    value={slot.time}
                    checked={bookable && slot.time === time}
                    disabled={!bookable}
                    onChange={() => onChange({ date: day, time: slot.time })}
                    aria-label={slotName(slot)}
                    className="peer sr-only"
                  />
                  <span
                    className={cx(
                      "flex min-h-12 items-center justify-center rounded-sm border px-2 font-mono font-medium",
                      bookable
                        ? "cursor-pointer border-line-strong peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent"
                        : "cursor-not-allowed border-line text-fg-muted line-through",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-(--focus-ring)",
                    )}
                  >
                    {formatClock(slot.time)}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {!loading && !failed && (full.length > 0 || low.length > 0) && (
          <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 text-small">
            {full.length > 0 && <p className="text-fg-muted">{t.fullNote(full.join(", "))}</p>}
            {low.length > 0 && (
              <p className="text-accent">{t.lowNote(low.map((s) => formatClock(s.time)).join(", "))}</p>
            )}
          </div>
        )}
        {nothingLeft && (
          <div className="flex flex-col items-start gap-2 rounded-sm border border-line p-4">
            <p>{(closed ? t.closedDay : t.nothingLeft)(dayLabel(day, dates.indexOf(day)))}</p>
            {nextDay ? (
              <button
                type="button"
                className="min-h-11 font-medium text-accent underline underline-offset-4"
                onClick={() => onChange({ date: nextDay, time: undefined })}
              >
                {t.tryDay(dayLabel(nextDay, dates.indexOf(nextDay)))}
              </button>
            ) : (
              <p className="text-fg-muted">{t.noneAhead}</p>
            )}
          </div>
        )}
      </fieldset>
    </div>
  );
}
