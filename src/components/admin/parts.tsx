"use client";

import { useEffect, useEffectEvent, useState, type ReactNode } from "react";
import { adminCopy } from "@/content/admin-copy";
import { copy } from "@/content/copy";
import { site } from "@/config/site";
import type { Booking } from "@/domain/booking/schema";
import { cx } from "@/lib/cx";
import { BROWSER_DB_KEY } from "@/services/mock/storageKey";
import type { ServiceError, ServiceResult } from "@/services/errors";

const t = adminCopy;

type Loaded<T> = ServiceResult<T> | "network";

/**
 * Loads a view for the signed-in account, again when `key` changes, and again when another tab
 * changes the demo data (a booking made in one tab shows up in the admin in another).
 */
export function useLoad<T>(load: () => Promise<ServiceResult<T>>, key: string) {
  const [state, setState] = useState<{ key: string; result: Loaded<T> } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const run = useEffectEvent((live: () => boolean) => {
    load()
      .then((result) => live() && setState({ key, result }))
      .catch(() => live() && setState({ key, result: "network" }));
  });

  useEffect(() => {
    let live = true;
    run(() => live);
    const onStorage = (e: StorageEvent) => {
      if (e.key === BROWSER_DB_KEY) run(() => live);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      live = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [key, attempt]);

  const current = state?.key === key ? state.result : null;
  return {
    result: current,
    data: current && current !== "network" && current.ok ? current.value : null,
    reload: () => setAttempt((n) => n + 1),
    /** Shows a fresh view a write returned, without loading again. */
    show: (value: T) => setState({ key, result: { ok: true, value } }),
  };
}

export function problemText(error: ServiceError | "network"): string {
  if (error === "network") return t.errors.network;
  if (error.code === "forbidden" || error.code === "not_allowed" || error.code === "not_found") {
    return t.errors[error.code];
  }
  if (error.code === "invalid_input") return t.errors.invalid;
  return copy.booking.errors[error.code];
}

/** Loading, failure and "not for this account" states around a loaded view. */
export function LoadState<T>({
  result,
  reload,
  children,
}: {
  readonly result: Loaded<T> | null;
  readonly reload: () => void;
  readonly children: (value: T) => ReactNode;
}) {
  if (result === null) return <p className="text-fg-muted">{t.loading}</p>;
  if (result !== "network" && result.ok) return <>{children(result.value)}</>;
  if (result !== "network" && result.error.code === "forbidden") {
    return <p className="rounded-sm border border-line p-4">{t.forbidden}</p>;
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <p className="text-danger">{t.loadError}</p>
      <button type="button" onClick={reload} className="min-h-11 font-medium text-accent underline">
        {t.retry}
      </button>
    </div>
  );
}

/** A polite live message after an action: what happened, and that it was logged. */
export function Notice({ message, tone = "done" }: { readonly message: string; readonly tone?: "done" | "problem" }) {
  return (
    <p role="status" aria-live="polite" className={cx("min-h-6", tone === "problem" ? "text-danger" : "text-success")}>
      {message}
    </p>
  );
}

export function PageTitle({ children, lead }: { readonly children: ReactNode; readonly lead?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-h1 font-semibold text-balance">{children}</h1>
      {lead && <p className="max-w-prose text-fg-muted">{lead}</p>}
    </header>
  );
}

const STATUS_TONE: Readonly<Record<Booking["status"], string>> = {
  held: "border-line-strong text-fg-muted",
  requested: "border-accent text-accent",
  confirmed: "border-success text-success",
  completed: "border-line-strong text-fg",
  no_show: "border-danger text-danger",
  declined: "border-line-strong text-fg-muted",
  cancelled: "border-line-strong text-fg-muted",
  expired: "border-line-strong text-fg-muted",
};

export function StatusChip({ status }: { readonly status: Booking["status"] }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-small", STATUS_TONE[status])}>
      {t.status[status]}
    </span>
  );
}

export const clockTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: site.timeZone }).format(
    new Date(iso),
  );

export const dayAndTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: site.timeZone,
  }).format(new Date(iso));
