"use client";

import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { copy } from "@/content/copy";
import { browseMenu, type MenuElement, type MenuFilter } from "@/domain/menu/browse";
import type { Menu } from "@/domain/menu/schema";
import { cx } from "@/lib/cx";
import { MenuList } from "./MenuList";
import { PeriodicTable } from "./PeriodicTable";
import { useMenuOverlay } from "./useMenuOverlay";

const t = copy.menu;
const FILTERS = Object.keys(t.filters) as MenuFilter[];
type View = "list" | "periodic";

interface MenuBrowserProps {
  readonly menu: Menu;
  /** Signature items with their derived element symbols, in display order. */
  readonly elements: readonly MenuElement[];
}

const toggleClass = (active: boolean) =>
  cx(
    "inline-flex min-h-11 items-center rounded-full border px-4 text-small font-medium transition-colors",
    active ? "border-accent bg-accent text-on-accent" : "border-line text-fg hover-fine:border-line-strong",
  );

/** Swap views inside a View Transition where the browser supports it and motion is welcome. */
function withTransition(update: () => void) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !document.startViewTransition) {
    update();
    return;
  }
  document.startViewTransition(() => flushSync(update));
}

export function MenuBrowser({ menu: printed, elements: printedElements }: MenuBrowserProps) {
  const menu = useMenuOverlay(printed);
  const elements = useMemo(() => {
    if (menu === printed) return printedElements;
    const byId = new Map(menu.items.map((i) => [i.id, i]));
    return printedElements.map((e) => ({ ...e, item: byId.get(e.item.id) ?? e.item }));
  }, [menu, printed, printedElements]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MenuFilter>("all");
  const [view, setView] = useState<View>("list");
  const deferredQuery = useDeferredValue(query);
  const searchId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const sections = useMemo(() => browseMenu(menu, deferredQuery, filter), [menu, deferredQuery, filter]);
  const visibleIds = useMemo(() => new Set(sections.flatMap((s) => s.items.map((i) => i.id))), [sections]);
  const shownElements = elements.filter((e) => visibleIds.has(e.item.id));
  const total = view === "list" ? visibleIds.size : shownElements.length;

  const suggest = (word: string) => {
    setQuery(word);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="sticky top-0 z-30 flex flex-col gap-3 border-b border-line bg-surface py-3">
        <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center">
          <label htmlFor={searchId} className="sr-only">
            {t.searchLabel}
          </label>
          <input
            ref={inputRef}
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            className="min-h-11 w-full rounded-sm border border-line-strong bg-surface-raised px-4 text-body text-fg placeholder:text-fg-muted tablet:max-w-sm"
          />
          <div role="group" aria-label={t.viewLabel} className="flex gap-2 tablet:ml-auto">
            {(["list", "periodic"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => withTransition(() => setView(v))}
                className={toggleClass(view === v)}
              >
                {t.views[v]}
              </button>
            ))}
          </div>
        </div>
        <div role="group" aria-label={t.filtersLabel} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cx(toggleClass(filter === f), "shrink-0")}
            >
              {t.filters[f]}
            </button>
          ))}
        </div>
        <p className="font-mono text-small text-fg-muted" aria-live="polite">
          {t.results(total)}
        </p>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-start gap-4 py-8">
          <p className="text-h3">{t.empty(deferredQuery || t.filters[filter])}</p>
          <p className="text-fg-muted">{t.emptyHint}</p>
          <div className="flex flex-wrap gap-2">
            {t.suggestions.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => {
                  setFilter("all");
                  suggest(word);
                }}
                className={toggleClass(false)}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      ) : view === "list" ? (
        <MenuList sections={sections} showSectionNav={!deferredQuery && filter === "all"} />
      ) : (
        <PeriodicTable elements={shownElements} />
      )}
    </div>
  );
}
