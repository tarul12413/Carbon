"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { clientServices } from "@/services/client";

const t = copy.booking.demo;

/** Fired after a demo control changes data, so open views can load it again. */
export const DEMO_CHANGED = "carbon:demo-changed";

interface DemoPanelProps {
  /** On an event page: adds "someone cancels", which opens a seat for the waitlist. */
  readonly eventSlug?: string;
  /** On the book wall: approves waiting books, standing in for staff moderation until M7. */
  readonly approveWall?: boolean;
  /** Extra controls for the page, e.g. the bank's answer on a pending payment. */
  readonly children?: ReactNode;
}

/** Demo-only controls (flag: devPanel). Not part of the product. */
export function DemoPanel({ eventSlug, approveWall, children }: DemoPanelProps) {
  const [message, setMessage] = useState("");
  const done = (text: string) => {
    setMessage(text);
    window.dispatchEvent(new Event(DEMO_CHANGED));
  };
  return (
    <details className="content-cap w-full pb-8 text-small">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-mono text-fg-muted">{t.open}</summary>
      <div className="mt-2 flex max-w-xl flex-col gap-3 rounded-sm border border-dashed border-line-strong p-4">
        <p className="text-fg-muted">{t.note}</p>
        <div className="flex flex-wrap gap-3">
          {children}
          {approveWall && (
            <Button
              variant="secondary"
              onClick={async () => done(t.approvedWall(await clientServices.demo.approveWall()))}
            >
              {t.approveWall}
            </Button>
          )}
          {eventSlug && (
            <Button
              variant="secondary"
              onClick={async () => done(t.opened(await clientServices.demo.openSeat(eventSlug)))}
            >
              {t.openSeat}
            </Button>
          )}
          <Button variant="secondary" onClick={async () => done(t.expired(await clientServices.demo.expireHolds()))}>
            {t.expire}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await clientServices.demo.reset();
              done(t.resetDone);
            }}
          >
            {t.reset}
          </Button>
        </div>
        <p aria-live="polite">{message}</p>
      </div>
    </details>
  );
}
