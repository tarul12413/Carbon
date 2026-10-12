"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox, TextField } from "@/components/ui/Field";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import { WALL_LIMITS } from "@/domain/wall/limits";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { clientServices } from "@/services/client";

const t = copy.wall;
type Field = "title" | "author" | "line" | "handle";

/** Wireframe 10, screen 2. Staff approve before anything shows. */
export function AddBookForm() {
  const [values, setValues] = useState<Record<Field, string>>({ title: "", author: "", line: "", handle: "" });
  const [showName, setShowName] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const openedAt = useRef<number | null>(null);
  const keyFor = useIdempotencyKey();
  const heading = useRef<HTMLHeadingElement>(null);

  /* The time trap starts when someone first touches the form, not at render (pure render). */
  const touch = () => {
    openedAt.current ??= Date.now();
  };
  const set = (field: Field) => (value: string) => {
    touch();
    setValues((v) => ({ ...v, [field]: value }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const input = { ...values, showName, website, openedAt: openedAt.current ?? Date.now() };
    try {
      const result = await clientServices.wall.submit(input, keyFor({ ...values, showName }));
      if (result.ok) {
        setSent(true);
        setErrors({});
        requestAnimationFrame(() => heading.current?.focus());
      } else if (result.error.code === "invalid_input") {
        const fields = result.error.fields ?? {};
        setErrors(
          Object.fromEntries(
            Object.entries(fields)
              .filter(([k]) => k !== "_")
              .map(([k, v]) => [k, t.errors[v as keyof typeof t.errors] ?? copy.booking.errors.invalid_input]),
          ),
        );
        if (fields._) setProblem(t.errors.profanity);
      } else setProblem(copy.booking.errors[result.error.code]);
    } catch {
      setProblem(copy.booking.errors.network);
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <h1 ref={heading} tabIndex={-1} className="text-display font-semibold text-balance outline-none">
          {t.sentTitle}
        </h1>
        <p className="text-h3 text-fg-muted">{t.sentBody}</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={routes.bookWall}>{t.seeWall}</ButtonLink>
          <Button
            variant="secondary"
            onClick={() => {
              setValues({ title: "", author: "", line: "", handle: "" });
              setShowName(false);
              openedAt.current = null;
              setSent(false);
            }}
          >
            {t.another}
          </Button>
        </div>
      </div>
    );
  }

  const field = (name: Field, label: string, hint?: string, autoComplete = "off") => (
    <TextField
      label={label}
      value={values[name]}
      onChange={(e) => set(name)(e.target.value)}
      onFocus={touch}
      maxLength={WALL_LIMITS[name]}
      autoComplete={autoComplete}
      error={errors[name]}
      hint={
        <>
          {hint && `${hint} `}
          <span className="font-mono" aria-hidden="true">
            {t.count(values[name].length, WALL_LIMITS[name])}
          </span>
        </>
      }
    />
  );

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      <h1 className="text-display font-semibold text-balance">{t.addTitle}</h1>
      {field("title", t.fields.title)}
      {field("author", t.fields.author)}
      {field("line", t.fields.line, t.fields.optional)}
      {field("handle", t.fields.handle, t.fields.optional, "given-name")}
      <Checkbox label={t.fields.showName} checked={showName} onChange={(e) => setShowName(e.target.checked)} />
      {/* Honeypot: off-screen and skipped by keyboard and screen readers; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] size-px overflow-hidden">
        <label>
          {copy.booking.details.botLabel}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>
      <div className="rounded-sm border border-line bg-surface-raised p-4 text-fg-muted">
        <p>{t.approval}</p>
        <p className="text-small">
          {t.nameNote}{" "}
          <Link href={routes.legal} className="text-accent underline underline-offset-4">
            {t.notice}
          </Link>
        </p>
      </div>
      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full tablet:w-auto tablet:self-start">
        {busy ? t.sending : t.submit}
      </Button>
    </form>
  );
}
