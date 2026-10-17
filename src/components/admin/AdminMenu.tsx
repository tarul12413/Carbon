"use client";

import { useDeferredValue, useId, useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox, TextArea, TextField, inputClass } from "@/components/ui/Field";
import { Chip } from "@/components/ui/Chip";
import { adminCopy } from "@/content/admin-copy";
import { canDo } from "@/domain/admin/access";
import { ADMIN_LIMITS } from "@/domain/admin/limits";
import { COLD_BREW_TAG, HOUSE_NAMED_TAG, formatPaise } from "@/domain/menu/browse";
import type { OutletSlug } from "@/domain/outlet";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { clientServices } from "@/services/client";
import type { AdminMenu as AdminMenuView, AdminMenuItem } from "@/services/admin";
import type { ServiceResult } from "@/services/errors";
import { useAdmin } from "./AdminShell";
import { LoadState, Notice, PageTitle, dayAndTime, problemText, useLoad } from "./parts";

const t = adminCopy.menu;
const TAGS = [COLD_BREW_TAG, HOUSE_NAMED_TAG] as const;
type Message = { text: string; tone: "done" | "problem" };

const rupees = (paise: number) => (paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2));
const megabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const fieldError = (key: string | undefined) =>
  key ? (t.errors[key as keyof typeof t.errors] ?? adminCopy.errors.invalid) : undefined;

/** Blueprint section 10, Menu: edit, draft then publish; availability at once; the PDF and its warning. */
export function AdminMenu() {
  const { actor, staff, scope } = useAdmin();
  const { result, reload, show } = useLoad(() => clientServices.admin.getMenu(actor), actor.staffId);
  const [message, setMessage] = useState<Message>({ text: "", tone: "done" });
  const keyFor = useIdempotencyKey();
  const editor = canDo(staff, "menu.edit");
  const mine = staff.outlets;
  const [picked, setPicked] = useState<OutletSlug | null>(null);
  const at = picked ?? (scope === "all" ? mine[0] : scope) ?? "c-scheme";

  /** Runs a write that returns the whole menu, then shows it. */
  const apply = async (
    call: (key: string) => Promise<ServiceResult<AdminMenuView>>,
    request: unknown,
    done: string,
  ) => {
    try {
      const out = await call(keyFor(request));
      if (out.ok) {
        show(out.value);
        setMessage({ text: `${done} ${adminCopy.logged}`, tone: "done" });
        return true;
      }
      setMessage({ text: problemText(out.error), tone: "problem" });
      return out.error.fields ?? {};
    } catch {
      setMessage({ text: problemText("network"), tone: "problem" });
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTitle lead={editor ? undefined : t.ownerOnly}>{t.title}</PageTitle>
      <LoadState result={result} reload={reload}>
        {(menu) => (
          <div className="flex flex-col gap-6">
            <PdfPanel menu={menu} editor={editor} apply={apply} />
            {editor && <Drafts menu={menu} apply={apply} />}
            <Notice message={message.text} tone={message.tone} />
            <Items menu={menu} at={at} onPick={setPicked} editor={editor} apply={apply} />
          </div>
        )}
      </LoadState>
    </div>
  );
}

type Apply = (
  call: (key: string) => Promise<ServiceResult<AdminMenuView>>,
  request: unknown,
  done: string,
) => Promise<boolean | Readonly<Record<string, string>>>;

function PdfPanel({
  menu,
  editor,
  apply,
}: {
  readonly menu: AdminMenuView;
  readonly editor: boolean;
  readonly apply: Apply;
}) {
  const { actor } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const inputId = useId();
  const stale = menu.changedSincePdf.length;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setProblem("");
    const header = await file.slice(0, 8).text();
    const input = { name: file.name, bytes: file.size, header };
    const out = await apply(
      (key) => clientServices.admin.uploadMenuPdf(actor, input, key),
      { pdf: input },
      t.pdf.uploaded,
    );
    if (typeof out === "object") {
      const key = Object.values(out)[0];
      setProblem(t.pdf.errors[key as keyof typeof t.pdf.errors] ?? adminCopy.errors.invalid);
    }
    setBusy(false);
  };

  return (
    <section
      aria-labelledby="menu-pdf"
      className="flex flex-col gap-3 rounded-sm border border-line bg-surface-raised p-4"
    >
      <h2 id="menu-pdf" className="text-h3 font-semibold">
        {t.pdf.title}
      </h2>
      <p>
        {t.pdf.current(menu.pdf.name, dayAndTime(menu.pdf.at), megabytes(menu.pdf.bytes))}
        {menu.pdf.shipped && <span className="text-fg-muted"> {t.pdf.shipped}</span>}
      </p>
      {stale > 0 ? (
        <p role="alert" className="rounded-sm border border-accent p-3 text-accent">
          {t.pdf.stale(stale)}
        </p>
      ) : (
        <p className="text-small text-fg-muted">{t.pdf.fresh}</p>
      )}
      {editor && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={inputId} className="font-medium">
            {busy ? t.pdf.uploading : t.pdf.upload}
          </label>
          <input
            id={inputId}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy}
            aria-describedby={`${inputId}-note`}
            onChange={(e) => {
              void upload(e.target.files?.[0]);
              e.target.value = "";
            }}
            className="min-h-11 text-small file:mr-3 file:min-h-11 file:rounded-sm file:border file:border-fg file:bg-transparent file:px-4 file:font-medium file:text-fg"
          />
          {problem && <p className="text-small text-danger">{problem}</p>}
          <p id={`${inputId}-note`} className="text-small text-fg-muted">
            {t.pdf.note}
          </p>
        </div>
      )}
    </section>
  );
}

function Drafts({ menu, apply }: { readonly menu: AdminMenuView; readonly apply: Apply }) {
  const { actor } = useAdmin();
  const [busy, setBusy] = useState(false);
  const count = menu.items.filter((i) => i.draft).length;
  if (count === 0) return <p className="text-small text-fg-muted">{t.draftsHint}</p>;
  return (
    <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 rounded-sm border border-accent bg-surface p-4">
      <div>
        <p className="font-medium">{t.drafts(count)}</p>
        <p className="text-small text-fg-muted">{t.draftsHint}</p>
      </div>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const drafts = menu.items.filter((i) => i.draft).map((i) => [i.item.id, i.draft]);
          await apply(
            (key) => clientServices.admin.publishMenu(actor, key),
            { publish: drafts },
            `${t.published(count)} ${t.publishedNote}`,
          );
          setBusy(false);
        }}
      >
        {t.publish}
      </Button>
    </div>
  );
}

function Items({
  menu,
  at,
  onPick,
  editor,
  apply,
}: {
  readonly menu: AdminMenuView;
  readonly at: OutletSlug;
  readonly onPick: (slug: OutletSlug) => void;
  readonly editor: boolean;
  readonly apply: Apply;
}) {
  const { actor, staff, outletName } = useAdmin();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const deferred = useDeferredValue(query.trim().toLowerCase());
  const searchId = useId();
  const outletId = useId();
  const switches = canDo(staff, "menu.availability", at);

  const groups = useMemo(
    () =>
      menu.categories
        .map((c) => ({
          category: c,
          items: menu.items.filter(
            (i) =>
              i.item.categoryId === c.id &&
              (!deferred || `${i.item.name} ${i.item.notes}`.toLowerCase().includes(deferred)),
          ),
        }))
        .filter((g) => g.items.length > 0),
    [menu, deferred],
  );

  const toggle = (row: AdminMenuItem, available: boolean) =>
    apply(
      (key) => clientServices.admin.setAvailability(actor, at, row.item.id, available, key),
      { at, id: row.item.id, available },
      available ? t.nowOn(row.item.name, outletName(at)) : t.nowOff(row.item.name, outletName(at)),
    );

  return (
    <section className="flex flex-col gap-5" aria-label={t.title}>
      <div className="grid gap-3 tablet:grid-cols-2">
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor={outletId} className="text-small font-medium">
            {t.availabilityAt}
          </label>
          <select
            id={outletId}
            className={inputClass}
            value={at}
            disabled={staff.outlets.length < 2}
            onChange={(e) => onPick(e.target.value as OutletSlug)}
          >
            {staff.outlets.map((o) => (
              <option key={o} value={o}>
                {outletName(o)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {groups.length === 0 && <p className="text-fg-muted">{t.noMatch}</p>}
      {groups.map(({ category, items }) => (
        <section key={category.id} aria-labelledby={`cat-${category.id}`} className="flex flex-col gap-2">
          <h2 id={`cat-${category.id}`} className="label-caps text-small text-fg-muted">
            {category.name}
          </h2>
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {items.map((row) => {
              const off = row.off.includes(at);
              return (
                <li key={row.item.id} className="flex flex-col gap-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {row.item.name}
                        {row.item.steepHours !== undefined && <Chip>{`${row.item.steepHours}h`}</Chip>}
                        {off && (
                          <span className="rounded-full border border-danger px-2.5 py-0.5 text-small text-danger">
                            {t.off}
                          </span>
                        )}
                        {row.draft && <Chip tone="outline">{t.draft}</Chip>}
                        {row.editedAt && !row.draft && <Chip tone="outline">{t.edited}</Chip>}
                      </p>
                      <p className="font-mono text-small text-fg-muted">
                        {row.item.prices
                          ? row.item.prices
                              .map((p) => `${p.label ? `${p.label} ` : ""}${formatPaise(p.paise)}`)
                              .join(" · ")
                          : row.item.priceNote}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {switches ? (
                        <Checkbox
                          label={t.available}
                          checked={!off}
                          aria-label={`${t.available}: ${row.item.name}`}
                          onChange={(e) => void toggle(row, e.target.checked)}
                        />
                      ) : null}
                      {editor && editing !== row.item.id && (
                        <Button
                          variant="secondary"
                          onClick={() => setEditing(row.item.id)}
                          aria-label={t.editTitle(row.item.name)}
                        >
                          {t.edit}
                        </Button>
                      )}
                    </div>
                  </div>
                  {editor && editing === row.item.id && (
                    <ItemEditor row={row} apply={apply} onClose={() => setEditing(null)} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}

function ItemEditor({
  row,
  apply,
  onClose,
}: {
  readonly row: AdminMenuItem;
  readonly apply: Apply;
  readonly onClose: () => void;
}) {
  const { actor } = useAdmin();
  const start = row.draft ?? {
    name: row.item.name,
    notes: row.item.notes,
    prices: row.item.prices?.map((p) => p.paise),
    steepHours: row.item.steepHours,
    tags: row.item.tags,
  };
  const [name, setName] = useState(start.name);
  const [notes, setNotes] = useState(start.notes);
  const [prices, setPrices] = useState((start.prices ?? []).map(rupees));
  const [steep, setSteep] = useState(start.steepHours !== undefined ? String(start.steepHours) : "");
  const [tags, setTags] = useState<readonly string[]>(start.tags);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const headingId = useId();

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    const input = {
      name,
      notes,
      ...(row.item.prices ? { prices } : {}),
      ...(row.item.steepHours !== undefined ? { steepHours: steep } : {}),
      tags: [...tags],
    };
    const out = await apply(
      (key) => clientServices.admin.saveDraft(actor, row.item.id, input, key),
      { draft: row.item.id, input },
      t.draftSaved,
    );
    setBusy(false);
    if (out === true) onClose();
    else if (typeof out === "object") setErrors(out);
  };

  const drop = async () => {
    setBusy(true);
    const out = await apply(
      (key) => clientServices.admin.saveDraft(actor, row.item.id, null, key),
      { drop: row.item.id, at: row.draft },
      t.draftDropped,
    );
    setBusy(false);
    if (out === true) onClose();
  };

  return (
    <form
      noValidate
      onSubmit={save}
      aria-labelledby={headingId}
      className="flex flex-col gap-4 rounded-sm border border-line-strong bg-surface-raised p-4"
    >
      <h3 id={headingId} className="font-semibold">
        {t.editTitle(row.item.name)}
      </h3>
      <TextField
        label={t.name}
        value={name}
        maxLength={ADMIN_LIMITS.itemName}
        onChange={(e) => setName(e.target.value)}
        error={fieldError(errors.name)}
      />
      <TextArea
        label={t.notes}
        value={notes}
        maxLength={ADMIN_LIMITS.itemNotes}
        onChange={(e) => setNotes(e.target.value)}
        error={fieldError(errors.notes)}
      />
      {row.item.prices ? (
        <div className="grid gap-3 tablet:grid-cols-2">
          {row.item.prices.map((p, i) => (
            <TextField
              key={p.label ?? i}
              label={t.price(p.label ?? "")}
              inputMode="decimal"
              value={prices[i] ?? ""}
              onChange={(e) => setPrices(prices.map((v, j) => (j === i ? e.target.value : v)))}
              error={fieldError(errors[`prices.${i}`] ?? errors.prices)}
            />
          ))}
        </div>
      ) : (
        <p className="text-small text-fg-muted">
          {t.priceNote}: {row.item.priceNote}
        </p>
      )}
      {row.item.steepHours !== undefined && (
        <TextField
          label={t.steep}
          type="number"
          inputMode="numeric"
          min={1}
          max={ADMIN_LIMITS.steepMax}
          value={steep}
          onChange={(e) => setSteep(e.target.value)}
          error={fieldError(errors.steepHours)}
        />
      )}
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-medium">{t.tags}</legend>
        {TAGS.map((tag) => (
          <Checkbox
            key={tag}
            label={t.tagNames[tag]}
            checked={tags.includes(tag)}
            onChange={(e) => setTags(e.target.checked ? [...tags, tag] : tags.filter((x) => x !== tag))}
          />
        ))}
        <p className="text-small text-fg-muted">{t.tagsHint}</p>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy}>
          {t.saveDraft}
        </Button>
        {row.draft && (
          <Button variant="secondary" disabled={busy} onClick={drop}>
            {t.dropDraft}
          </Button>
        )}
        <Button variant="quiet" onClick={onClose}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
