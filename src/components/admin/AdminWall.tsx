"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { adminCopy } from "@/content/admin-copy";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { clientServices } from "@/services/client";
import type { WallQueue } from "@/services/admin";
import type { ServiceResult } from "@/services/errors";
import { useAdmin } from "./AdminShell";
import { LoadState, Notice, PageTitle, dayAndTime, problemText, useLoad } from "./parts";

const t = adminCopy.wall;

/** Blueprint section 10, Book wall: the approval queue and reader reports. */
export function AdminWall() {
  const { actor } = useAdmin();
  const { result, reload, show } = useLoad(() => clientServices.admin.wallQueue(actor), actor.staffId);
  const [message, setMessage] = useState<{ text: string; tone: "done" | "problem" }>({ text: "", tone: "done" });
  const [busy, setBusy] = useState(false);
  const keyFor = useIdempotencyKey();

  const act = async (call: (key: string) => Promise<ServiceResult<WallQueue>>, request: unknown, done: string) => {
    setBusy(true);
    try {
      const out = await call(keyFor(request));
      if (out.ok) {
        show(out.value);
        setMessage({ text: `${done} ${adminCopy.logged}`, tone: "done" });
      } else setMessage({ text: problemText(out.error), tone: "problem" });
    } catch {
      setMessage({ text: problemText("network"), tone: "problem" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle>{t.title}</PageTitle>
      <Notice message={message.text} tone={message.tone} />
      <LoadState result={result} reload={reload}>
        {(queue) => (
          <div className="grid gap-8 laptop:grid-cols-2">
            <section aria-labelledby="wall-waiting" className="flex flex-col gap-3">
              <h2 id="wall-waiting" className="text-h3 font-semibold">
                {t.waitingTitle}
              </h2>
              {queue.waiting.length === 0 ? (
                <p className="text-fg-muted">{t.noneWaiting}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {queue.waiting.map((e) => (
                    <li key={e.id} className="flex flex-col gap-2 rounded-sm border border-line bg-surface-raised p-4">
                      <p className="font-medium">
                        {e.title} <span className="font-normal text-fg-muted">{t.by(e.author)}</span>
                      </p>
                      {e.line && <p className="italic">“{e.line}”</p>}
                      <p className="text-small text-fg-muted">
                        {e.showName && e.handle ? t.name(e.handle) : t.noName} · {t.sent(dayAndTime(e.createdAt))}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={busy}
                          aria-label={`${t.approve}: ${e.title}`}
                          onClick={() =>
                            act(
                              (key) => clientServices.admin.moderate(actor, e.id, "approve", key),
                              { id: e.id, d: "approve" },
                              t.done.approve(e.title),
                            )
                          }
                        >
                          {t.approve}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          aria-label={`${t.reject}: ${e.title}`}
                          onClick={() =>
                            act(
                              (key) => clientServices.admin.moderate(actor, e.id, "reject", key),
                              { id: e.id, d: "reject" },
                              t.done.reject(e.title),
                            )
                          }
                        >
                          {t.reject}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section aria-labelledby="wall-reported" className="flex flex-col gap-3">
              <h2 id="wall-reported" className="text-h3 font-semibold">
                {t.reportedTitle}
              </h2>
              {queue.reported.length === 0 ? (
                <p className="text-fg-muted">{t.noneReported}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {queue.reported.map((r) => (
                    <li key={r.key} className="flex flex-col gap-2 rounded-sm border border-line bg-surface-raised p-4">
                      <p className="font-medium">
                        {r.title} <span className="font-normal text-fg-muted">{t.by(r.author)}</span>
                      </p>
                      <p className="text-small text-danger">{t.reports(r.reports)}</p>
                      {r.lines.length > 0 && (
                        <ul className="flex flex-col gap-1 text-small italic">
                          {r.lines.map((line, i) => (
                            <li key={i}>“{line}”</li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <Button
                          disabled={busy}
                          aria-label={`${t.hide}: ${r.title}`}
                          onClick={() =>
                            act(
                              (key) => clientServices.admin.resolveReport(actor, r.key, "hide", key),
                              { key: r.key, d: "hide" },
                              t.done.hide(r.title),
                            )
                          }
                        >
                          {t.hide}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={busy}
                          aria-label={`${t.keep}: ${r.title}`}
                          onClick={() =>
                            act(
                              (key) => clientServices.admin.resolveReport(actor, r.key, "keep", key),
                              { key: r.key, d: "keep" },
                              t.done.keep(r.title),
                            )
                          }
                        >
                          {t.keep}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </LoadState>
    </div>
  );
}
