"use client";

import { useSyncExternalStore } from "react";
import { formatClock, getOutletStatus, type DailyHours } from "@/domain/hours";
import { copy } from "@/content/copy";
import { cx } from "@/lib/cx";

const subscribe = (onChange: () => void) => {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const noMinuteOnServer = () => null;

interface OutletStatusProps {
  readonly hours: DailyHours;
  readonly timeZone: string;
  readonly className?: string;
}

/**
 * Open or closed right now. The server renders plain hours (the page is static);
 * the browser swaps in the live status and refreshes it every 30 seconds.
 */
export function OutletStatus({ hours, timeZone, className }: OutletStatusProps) {
  const minute = useSyncExternalStore(subscribe, currentMinute, noMinuteOnServer);

  if (minute === null) {
    return (
      <span className={cx("inline-flex items-center gap-2 text-fg-muted", className)}>
        <span className="size-2 rounded-full border border-current" aria-hidden="true" />
        {copy.status.hours(formatClock(hours.open), formatClock(hours.close))}
      </span>
    );
  }

  const status = getOutletStatus(hours, new Date(minute * 60_000), timeZone);
  const open = status.state === "open";
  const text = open
    ? copy.status.open(formatClock(status.closesAt))
    : status.opensDay === "today"
      ? copy.status.opensToday(formatClock(status.opensAt))
      : copy.status.opensTomorrow(formatClock(status.opensAt));

  return (
    <span className={cx("inline-flex items-center gap-2", open ? "text-success" : "text-fg-muted", className)}>
      <span className={cx("size-2 rounded-full", open ? "bg-current" : "border border-current")} aria-hidden="true" />
      {text}
    </span>
  );
}
