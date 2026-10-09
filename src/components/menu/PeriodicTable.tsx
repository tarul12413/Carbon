"use client";

import { useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import { formatPrices, type MenuElement } from "@/domain/menu/browse";
import { cx } from "@/lib/cx";

const t = copy.menu;

export function PeriodicTable({ elements }: { readonly elements: readonly MenuElement[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<MenuElement | null>(null);

  const show = (element: MenuElement) => {
    setOpen(element);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <div className="flex flex-col gap-6">
      <p className="text-fg-muted">
        {t.periodic.intro} <span className="text-small">{t.periodic.listAlternative}</span>
      </p>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
        {elements.map((element) => {
          const brew = element.item.steepHours !== undefined;
          return (
            <li key={element.item.id} style={{ viewTransitionName: `el-${element.item.id}` }}>
              <button
                type="button"
                onClick={() => show(element)}
                aria-haspopup="dialog"
                className={cx(
                  "flex min-h-36 w-full flex-col justify-between gap-1 rounded-sm border p-2.5 text-left transition-transform active:scale-[0.98]",
                  brew ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface-raised text-fg",
                )}
              >
                <span className="flex justify-between font-mono text-small">
                  <span>{element.number}</span>
                  {brew && <span>{element.item.steepHours}h</span>}
                </span>
                <span className="text-[2.75rem] leading-none font-semibold" aria-hidden="true">
                  {element.symbol}
                </span>
                <span className="text-small leading-tight font-medium">{element.item.name}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        aria-labelledby="element-title"
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="mx-auto mt-auto mb-0 w-full max-w-lg rounded-t-md border border-line bg-surface p-0 text-fg backdrop:bg-carbon-black/70 tablet:my-auto tablet:rounded-md"
      >
        {open && (
          <div className="flex flex-col gap-4 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span
                  className="flex size-16 items-center justify-center rounded-sm bg-accent text-h2 font-semibold text-on-accent"
                  aria-hidden="true"
                >
                  {open.symbol}
                </span>
                <h2 id="element-title" className="text-h3 font-semibold">
                  {open.item.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="inline-flex size-11 items-center justify-center rounded-sm"
                autoFocus
              >
                <Icon name="close" label={t.periodic.close} />
              </button>
            </div>
            {open.item.notes && <p className="text-fg-muted italic">{open.item.notes}</p>}
            <div className="flex flex-wrap items-center gap-3">
              {open.item.steepHours !== undefined && <Chip>{t.periodic.steep(open.item.steepHours)}</Chip>}
              {open.item.servedHot && <Chip tone="outline">{t.servedHot}</Chip>}
              <span className="ml-auto font-mono">{formatPrices(open.item)}</span>
            </div>
            <ButtonLink href={routes.book}>{t.periodic.book}</ButtonLink>
          </div>
        )}
      </dialog>
    </div>
  );
}
