"use client";

import { useId, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, inputClass } from "@/components/ui/Field";
import { adminCopy } from "@/content/admin-copy";
import { copy } from "@/content/copy";
import { ADMIN_LIMITS } from "@/domain/admin/limits";
import type { Enquiry } from "@/domain/enquiry/schema";
import { fullDate } from "@/domain/time";
import { cx } from "@/lib/cx";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { clientServices } from "@/services/client";
import { useAdmin } from "./AdminShell";
import { LoadState, Notice, PageTitle, dayAndTime, problemText, useLoad } from "./parts";

const t = adminCopy.enquiries;
const STATUSES = ["new", "replied", "closed"] as const;
type Status = (typeof STATUSES)[number];

/** Blueprint section 10, Enquiries inbox: catering, collabs, workshops, with status. */
export function AdminEnquiries() {
  const { actor } = useAdmin();
  const { result, reload } = useLoad(() => clientServices.admin.listEnquiries(actor), actor.staffId);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [message, setMessage] = useState<{ text: string; tone: "done" | "problem" }>({ text: "", tone: "done" });

  return (
    <div className="flex flex-col gap-6">
      <PageTitle lead={t.replyNote}>{t.title}</PageTitle>
      <div role="group" aria-label={t.filter} className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={filter === s}
            onClick={() => setFilter(s)}
            className={cx(
              "inline-flex min-h-11 items-center rounded-full border px-4 text-small font-medium",
              filter === s ? "border-accent bg-accent text-on-accent" : "border-line-strong text-fg",
            )}
          >
            {s === "all" ? t.all : t.statuses[s]}
          </button>
        ))}
      </div>
      <Notice message={message.text} tone={message.tone} />
      <LoadState result={result} reload={reload}>
        {(enquiries) => {
          const shown = enquiries.filter((e) => filter === "all" || e.status === filter);
          if (enquiries.length === 0) return <p className="text-fg-muted">{t.none}</p>;
          if (shown.length === 0) return <p className="text-fg-muted">{t.noneFiltered}</p>;
          return (
            <ul className="flex flex-col gap-3">
              {shown.map((e) => (
                <EnquiryCard key={e.code} enquiry={e} onSaved={setMessage} onChanged={reload} />
              ))}
            </ul>
          );
        }}
      </LoadState>
    </div>
  );
}

function EnquiryCard({
  enquiry,
  onSaved,
  onChanged,
}: {
  readonly enquiry: Enquiry;
  readonly onSaved: (message: { text: string; tone: "done" | "problem" }) => void;
  readonly onChanged: () => void;
}) {
  const { actor, outletName } = useAdmin();
  const [status, setStatus] = useState<Status>(enquiry.status);
  const [note, setNote] = useState(enquiry.note ?? "");
  const [busy, setBusy] = useState(false);
  const keyFor = useIdempotencyKey();
  const statusId = useId();

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const update = { status, note };
    try {
      const out = await clientServices.admin.updateEnquiry(
        actor,
        enquiry.code,
        update,
        keyFor({ code: enquiry.code, ...update }),
      );
      if (out.ok) {
        onSaved({ text: `${t.saved(enquiry.code)} ${adminCopy.logged}`, tone: "done" });
        onChanged();
      } else onSaved({ text: problemText(out.error), tone: "problem" });
    } catch {
      onSaved({ text: problemText("network"), tone: "problem" });
    } finally {
      setBusy(false);
    }
  };

  const facts = [
    enquiry.outlet && outletName(enquiry.outlet),
    enquiry.date && t.on(fullDate(enquiry.date)),
    enquiry.guests && t.guests(enquiry.guests),
  ].filter(Boolean);

  return (
    <li className="flex flex-col gap-3 rounded-sm border border-line bg-surface-raised p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-mono">{enquiry.code}</span>
        <span className="font-medium">{copy.enquire.types[enquiry.type].label}</span>
        <span className="text-small text-fg-muted">{dayAndTime(enquiry.createdAt)}</span>
      </div>
      <p className="text-h3 font-medium">
        {enquiry.name} <span className="font-mono text-small text-fg-muted">{enquiry.phone}</span>
      </p>
      {facts.length > 0 && <p className="text-small text-fg-muted">{facts.join(" · ")}</p>}
      <p className="whitespace-pre-line">{enquiry.details}</p>
      <form onSubmit={save} className="grid gap-3 tablet:grid-cols-[12rem_1fr] tablet:items-start">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={statusId} className="font-medium">
            {t.status}
          </label>
          <select
            id={statusId}
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.statuses[s]}
              </option>
            ))}
          </select>
        </div>
        <TextArea
          label={t.note}
          value={note}
          rows={2}
          maxLength={ADMIN_LIMITS.staffNote}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          type="submit"
          disabled={busy || (status === enquiry.status && note === (enquiry.note ?? ""))}
          className="tablet:col-start-2 tablet:justify-self-start"
          aria-label={`${t.save}: ${enquiry.code}`}
        >
          {t.save}
        </Button>
      </form>
    </li>
  );
}
