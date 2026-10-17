"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { adminCopy } from "@/content/admin-copy";
import { canDo } from "@/domain/admin/access";
import { ADMIN_LIMITS } from "@/domain/admin/limits";
import { formatClock } from "@/domain/hours";
import { fullDate } from "@/domain/time";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { clientServices } from "@/services/client";
import type { OutletSettingsView } from "@/services/admin";
import { useAdmin } from "./AdminShell";
import { LoadState, Notice, PageTitle, problemText, useLoad } from "./parts";

const t = adminCopy.capacity;
type ErrorKey = keyof typeof t.errors;
const errorText = (key: string | undefined) =>
  key ? (t.errors[key as ErrorKey] ?? adminCopy.errors.invalid) : undefined;

/** Blueprint section 10, Capacity and hours: hours, seats per slot and closed dates, per outlet. */
export function AdminCapacity() {
  const { actor, staff, scope } = useAdmin();
  const { result, reload } = useLoad(() => clientServices.admin.getSettings(actor), actor.staffId);
  return (
    <div className="flex flex-col gap-6">
      <PageTitle lead={t.lead}>{t.title}</PageTitle>
      <LoadState result={result} reload={reload}>
        {(views) => (
          <div className="grid gap-6 laptop:grid-cols-2">
            {views
              .filter((v) => scope === "all" || v.slug === scope)
              .map((v) => (
                <OutletForm key={v.slug} view={v} editable={canDo(staff, "capacity.edit", v.slug)} />
              ))}
          </div>
        )}
      </LoadState>
    </div>
  );
}

function OutletForm({ view, editable }: { readonly view: OutletSettingsView; readonly editable: boolean }) {
  const { actor, outletName } = useAdmin();
  const [open, setOpen] = useState(view.settings.open);
  const [close, setClose] = useState(view.settings.close);
  const [seats, setSeats] = useState(String(view.settings.capacityPerSlot));
  const [closed, setClosed] = useState(view.settings.blackouts);
  const [newDate, setNewDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; tone: "done" | "problem" }>({ text: "", tone: "done" });
  const keyFor = useIdempotencyKey();
  const name = outletName(view.slug);
  const headingId = `capacity-${view.slug}`;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    const input = { open, close, capacityPerSlot: seats, blackouts: closed };
    try {
      const done = await clientServices.admin.saveSettings(
        actor,
        view.slug,
        input,
        keyFor({ slug: view.slug, ...input }),
      );
      if (done.ok) {
        setErrors({});
        const outside = done.value.outside > 0 ? ` ${t.outside(done.value.outside)}` : "";
        setMessage({ text: `${t.saved}${outside} ${adminCopy.logged}`, tone: "done" });
      } else {
        setErrors(Object.fromEntries(Object.entries(done.error.fields ?? {}).map(([k, v]) => [k, errorText(v) ?? ""])));
        setMessage({ text: problemText(done.error), tone: "problem" });
      }
    } catch {
      setMessage({ text: problemText("network"), tone: "problem" });
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    if (!newDate || closed.some((b) => b.date === newDate)) return;
    setClosed([...closed, { date: newDate, note: newNote.trim() }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewDate("");
    setNewNote("");
  };
  const closedError = Object.entries(errors).find(([k]) => k.startsWith("blackouts"))?.[1];

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-sm border border-line bg-surface-raised p-4"
    >
      <h2 id={headingId} className="text-h3 font-semibold">
        {name}
      </h2>
      <p className="text-small text-fg-muted">
        {t.defaults(
          `${formatClock(view.defaults.open)} to ${formatClock(view.defaults.close)}`,
          view.defaults.capacityPerSlot,
        )}
      </p>
      <form noValidate onSubmit={save} className="flex flex-col gap-4">
        <fieldset disabled={!editable} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label={t.open}
              type="time"
              value={open}
              onChange={(e) => setOpen(e.target.value)}
              error={errors.open}
            />
            <TextField
              label={t.close}
              type="time"
              value={close}
              onChange={(e) => setClose(e.target.value)}
              error={errors.close}
            />
          </div>
          <p className="-mt-2 text-small text-fg-muted">{t.closeHint}</p>
          <TextField
            label={t.seats}
            type="number"
            inputMode="numeric"
            min={1}
            max={ADMIN_LIMITS.capacityMax}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            error={errors.capacityPerSlot}
          />
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-medium">{t.closed}</legend>
            <p className="text-small text-fg-muted">{t.closedHint}</p>
            {closed.length === 0 ? (
              <p className="text-small text-fg-muted">{t.noClosed}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {closed.map((b) => (
                  <li
                    key={b.date}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2"
                  >
                    <span>
                      {fullDate(b.date)}
                      {b.note && <span className="text-fg-muted"> · {b.note}</span>}
                    </span>
                    <Button
                      variant="quiet"
                      aria-label={t.remove(fullDate(b.date))}
                      onClick={() => setClosed(closed.filter((c) => c.date !== b.date))}
                    >
                      <Icon name="close" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {closedError && <p className="text-small text-danger">{closedError}</p>}
            <div className="grid gap-3 tablet:grid-cols-[auto_1fr_auto] tablet:items-end">
              <TextField label={t.addDate} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              <TextField
                label={t.addNote}
                value={newNote}
                maxLength={ADMIN_LIMITS.blackoutNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button variant="secondary" onClick={add} disabled={!newDate}>
                {t.add}
              </Button>
            </div>
          </fieldset>
        </fieldset>
        {editable && (
          <Button type="submit" disabled={busy} className="self-start">
            {busy ? t.saving : t.save}
          </Button>
        )}
        <Notice message={message.text} tone={message.tone} />
      </form>
    </section>
  );
}
