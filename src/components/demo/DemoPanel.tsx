"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { clientServices } from "@/services/client";

const t = copy.booking.demo;

/** Demo-only controls (flag: devPanel). Not part of the product. */
export function DemoPanel() {
  const [message, setMessage] = useState("");
  return (
    <details className="content-cap w-full pb-8 text-small">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-mono text-fg-muted">{t.open}</summary>
      <div className="mt-2 flex max-w-xl flex-col gap-3 rounded-sm border border-dashed border-line-strong p-4">
        <p className="text-fg-muted">{t.note}</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={async () => setMessage(t.expired(await clientServices.demo.expireHolds()))}
          >
            {t.expire}
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              await clientServices.demo.reset();
              setMessage(t.resetDone);
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
