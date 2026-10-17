"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { DEMO_CHANGED } from "@/components/demo/DemoPanel";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { spineShape } from "@/domain/wall/spine";
import { cx } from "@/lib/cx";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { clientServices } from "@/services/client";
import type { Shelf as ShelfData, Spine } from "@/services/wall";

const t = copy.wall;
const service = clientServices.wall;
/** Books this browser already said "I read this too" for, or reported. */
const DONE_KEY = "carbon-demo:wall-done";

/** Static class names, so Tailwind sees every spine colour. */
const SPINE_BG = ["bg-spine-0", "bg-spine-1", "bg-spine-2", "bg-spine-3", "bg-spine-4", "bg-spine-5"] as const;

const remembered = (): Record<string, "read" | "reported" | "both"> => {
  try {
    return JSON.parse(window.localStorage.getItem(DONE_KEY) ?? "{}") as Record<string, "read" | "reported" | "both">;
  } catch {
    return {};
  }
};
const remember = (key: string, what: "read" | "reported") => {
  try {
    const all = remembered();
    const before = all[key];
    all[key] = before && before !== what ? "both" : what;
    window.localStorage.setItem(DONE_KEY, JSON.stringify(all));
  } catch {
    /* Storage blocked: the button simply works again after a reload. */
  }
};

/** The shelf (wireframe 10, screens 1 and 3). Data lives in this browser in the demo, so it loads here. */
export function Shelf() {
  const [shelf, setShelf] = useState<ShelfData | null>(null);
  const [open, setOpen] = useState<Spine | null>(null);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let live = true;
    const load = () =>
      service
        .getShelf()
        .then((r) => live && r.ok && setShelf(r.value))
        .catch(() => null);
    void load();
    window.addEventListener(DEMO_CHANGED, load);
    return () => {
      live = false;
      window.removeEventListener(DEMO_CHANGED, load);
    };
  }, []);

  /* Spines slide on only when the shelf is on screen (Blueprint section 7: paused off-screen). */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [shelf]);

  /* Holds the loaded height of the sample shelf (16 books and the count line) at each width, so nothing below it moves. */
  if (!shelf) {
    return (
      <div
        className="shelf min-h-[39.3rem] tablet:min-h-[32.65rem] laptop:min-h-[17rem]"
        aria-busy="true"
        aria-label={t.shelfLabel}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {shelf.spines.length === 0 ? (
        <p className="rounded-md border border-dashed border-line-strong p-6 text-fg-muted">{t.empty}</p>
      ) : (
        <ul ref={ref} aria-label={t.shelfLabel} className="shelf" data-in-view={inView ? "" : undefined}>
          {shelf.spines.map((spine, i) => {
            const shape = spineShape(spine.key);
            return (
              <li key={spine.key} className="shelf-slot">
                <button
                  type="button"
                  onClick={() => setOpen(spine)}
                  aria-label={t.spineLabel(spine.title, spine.author, spine.readers)}
                  aria-haspopup="dialog"
                  style={
                    {
                      height: `${shape.height * 100}%`,
                      width: `${shape.width}rem`,
                      "--tilt": shape.tilt,
                      "--i": Math.min(i, 40),
                    } as CSSProperties
                  }
                  className={cx(
                    "spine flex items-start justify-center rounded-t-sm border border-white/10 px-1 py-3 text-small font-medium text-bone",
                    "transition-transform hover-fine:-translate-y-1",
                    SPINE_BG[shape.colour],
                  )}
                >
                  <span className="spine-title" aria-hidden="true">
                    {spine.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-fg-muted">
        {t.stats(shelf.spines.length, shelf.readers)}
        {shelf.waiting > 0 && <span className="ml-3 text-accent">{t.waiting(shelf.waiting)}</span>}
      </p>
      {open && (
        <SpineDetail
          spine={open}
          onClose={() => setOpen(null)}
          onChange={(spine) => {
            setOpen(spine);
            setShelf(
              (s) =>
                s && { ...s, spines: s.spines.map((x) => (x.key === spine.key ? spine : x)), readers: s.readers + 1 },
            );
          }}
        />
      )}
    </div>
  );
}

function SpineDetail({
  spine,
  onClose,
  onChange,
}: {
  readonly spine: Spine;
  readonly onClose: () => void;
  readonly onChange: (spine: Spine) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [done, setDone] = useState(() => remembered()[spine.key]);
  const [notice, setNotice] = useState("");
  const keyFor = useIdempotencyKey();
  const shape = spineShape(spine.key);

  useEffect(() => {
    const el = dialog.current;
    el?.showModal();
    return () => el?.close();
  }, []);

  const read = done === "read" || done === "both";
  const reported = done === "reported" || done === "both";

  return (
    <dialog
      ref={dialog}
      aria-labelledby="spine-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-md border border-line bg-surface-raised p-0 text-fg backdrop:bg-black/70"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span aria-hidden="true" className={cx("h-20 w-5 shrink-0 rounded-t-sm", SPINE_BG[shape.colour])} />
            <div>
              <h2 id="spine-title" className="text-h2 font-semibold text-balance break-words">
                {spine.title}
              </h2>
              <p className="text-fg-muted">{t.by(spine.author)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={t.close}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm"
          >
            <Icon name="close" />
          </button>
        </div>

        {spine.lines.length > 0 && (
          <ul className="flex flex-col gap-3">
            {spine.lines.map((l, i) => (
              <li key={i} className="rounded-sm border border-line-strong p-4">
                <blockquote>&ldquo;{l.line}&rdquo;</blockquote>
                {l.name && <p className="mt-1 text-accent">{l.name}</p>}
              </li>
            ))}
          </ul>
        )}

        <p className="text-h3">{t.shelvedBy(spine.readers)}</p>
        <p role="status" className={notice ? "text-success" : "sr-only"}>
          {notice}
        </p>
        <Button
          variant="secondary"
          disabled={read}
          onClick={async () => {
            const result = await service.addReader(spine.key, keyFor({ op: "read", key: spine.key })).catch(() => null);
            if (result?.ok) {
              remember(spine.key, "read");
              setDone(remembered()[spine.key]);
              setNotice(t.counted);
              onChange(result.value);
            }
          }}
        >
          {read ? t.counted : t.readToo}
        </Button>
        <button
          type="button"
          disabled={reported}
          onClick={async () => {
            const result = await service.report(spine.key, keyFor({ op: "report", key: spine.key })).catch(() => null);
            if (result?.ok) {
              remember(spine.key, "reported");
              setDone(remembered()[spine.key]);
              setNotice(t.reported);
            }
          }}
          className="inline-flex min-h-11 items-center self-end text-small text-fg-muted disabled:opacity-60"
        >
          {reported ? t.reported : t.report}
        </button>
      </div>
    </dialog>
  );
}
