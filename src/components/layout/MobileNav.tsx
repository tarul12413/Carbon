"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import { primaryNav } from "./navItems";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="laptop:hidden">
      <button
        ref={toggleRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? copy.nav.close : copy.nav.open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-11 items-center justify-center rounded-sm"
      >
        <Icon name={open ? "close" : "menu"} className="size-6" />
      </button>
      <nav
        id={panelId}
        aria-label={copy.nav.label}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-line bg-surface"
      >
        <ul className="content-cap flex flex-col py-4">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} onClick={close} className="flex min-h-12 items-center text-h3 font-medium">
                {item.label}
              </Link>
            </li>
          ))}
          <li className="pt-4 pb-2">
            <Link href={routes.book} onClick={close} className={buttonClass("primary", "w-full")}>
              {copy.nav.book}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
