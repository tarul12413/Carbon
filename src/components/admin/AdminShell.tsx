"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useId, useState, useSyncExternalStore, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { inputClass } from "@/components/ui/Field";
import { adminCopy, staffCopy } from "@/content/admin-copy";
import { routes } from "@/config/routes";
import { sectionsFor, type AdminActor, type AdminSection } from "@/domain/admin/access";
import type { OutletSlug } from "@/domain/outlet";
import { SAMPLE_STAFF, staffById, type StaffMember } from "@/domain/staff";
import { cx } from "@/lib/cx";
import type { OutletScope } from "@/services/admin";

const t = adminCopy;
const ACCOUNT_KEY = "carbon-demo:admin";
const ACCOUNT_CHANGED = "carbon:admin-account";

export interface AdminOutlet {
  readonly slug: OutletSlug;
  readonly name: string;
}

interface AdminContextValue {
  readonly actor: AdminActor;
  readonly staff: StaffMember;
  readonly scope: OutletScope;
  readonly outlets: readonly AdminOutlet[];
  readonly outletName: (slug: OutletSlug) => string;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin outside AdminShell");
  return value;
}

/* The sample account lives in this browser, like the rest of the demo. */
const subscribe = (onChange: () => void) => {
  window.addEventListener(ACCOUNT_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(ACCOUNT_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
};
const readAccount = () => {
  try {
    return window.localStorage.getItem(ACCOUNT_KEY) ?? "";
  } catch {
    return "";
  }
};
function saveAccount(id: string | null) {
  try {
    if (id) window.localStorage.setItem(ACCOUNT_KEY, id);
    else window.localStorage.removeItem(ACCOUNT_KEY);
  } catch {
    /* Storage blocked: the sign-in lasts until the page reloads. */
  }
  window.dispatchEvent(new Event(ACCOUNT_CHANGED));
}

const SECTION_OF: Readonly<Record<string, AdminSection>> = {
  bookings: "bookings",
  capacity: "capacity",
  menu: "menu",
  events: "events",
  wall: "wall",
  enquiries: "enquiries",
  audit: "audit",
};

function sectionOf(pathname: string): AdminSection {
  const segment = pathname.split("/")[2] ?? "";
  return SECTION_OF[segment] ?? "dashboard";
}

interface AdminShellProps {
  readonly outlets: readonly AdminOutlet[];
  readonly children: ReactNode;
}

/** Mock sign-in with a role switcher (brief, /admin/*), the section nav, and the outlet scope. */
export function AdminShell({ outlets, children }: AdminShellProps) {
  const saved = useSyncExternalStore(subscribe, readAccount, () => null);
  const [fallback, setFallback] = useState<string | null>(null);
  const id = saved || fallback;
  const staff = staffById(id);

  if (saved === null) return <p className="py-10 text-fg-muted">{t.loading}</p>;
  const choose = (next: string | null) => {
    setFallback(next);
    saveAccount(next);
  };
  if (!staff) return <SignIn outlets={outlets} onChoose={choose} />;
  return (
    <SignedIn key={staff.id} staff={staff} outlets={outlets} onChoose={choose}>
      {children}
    </SignedIn>
  );
}

const placeOf = (staff: StaffMember, outlets: readonly AdminOutlet[]) =>
  staff.outlets.length > 1
    ? t.allOutlets
    : (outlets.find((o) => o.slug === staff.outlets[0])?.name ?? staff.outlets[0] ?? "");

function SignIn({
  outlets,
  onChoose,
}: {
  readonly outlets: readonly AdminOutlet[];
  readonly onChoose: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6 py-8 laptop:py-14">
      <header className="flex flex-col gap-3">
        <p className="label-caps text-small text-fg-muted">{t.eyebrow}</p>
        <h1 className="text-h1 font-semibold text-balance">{t.signIn.title}</h1>
        <p className="max-w-prose text-fg-muted">{t.signIn.lead}</p>
      </header>
      <ul className="grid gap-3 tablet:grid-cols-2 laptop:grid-cols-3">
        {SAMPLE_STAFF.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onChoose(s.id)}
              className="flex h-full min-h-11 w-full flex-col items-start gap-1 rounded-sm border border-line-strong p-4 text-left hover-fine:border-accent"
            >
              <span className="font-medium">{t.accountLabel(staffCopy.roles[s.role], placeOf(s, outlets))}</span>
              <span className="text-small text-fg-muted">{t.signIn.roles[s.role]}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-small text-fg-muted">{t.signIn.note}</p>
    </div>
  );
}

function SignedIn({
  staff,
  outlets,
  onChoose,
  children,
}: {
  readonly staff: StaffMember;
  readonly outlets: readonly AdminOutlet[];
  readonly onChoose: (id: string | null) => void;
  readonly children: ReactNode;
}) {
  const [scope, setScope] = useState<OutletScope>(staff.outlets.length > 1 ? "all" : (staff.outlets[0] ?? "all"));
  const pathname = usePathname();
  const section = sectionOf(pathname);
  const sections = sectionsFor(staff);
  const accountId = useId();
  const scopeId = useId();
  const outletName = (slug: OutletSlug) => outlets.find((o) => o.slug === slug)?.name ?? slug;
  const mine = outlets.filter((o) => staff.outlets.includes(o.slug));

  return (
    <AdminContext.Provider value={{ actor: { staffId: staff.id }, staff, scope, outlets, outletName }}>
      <div className="flex flex-col gap-6 py-6 laptop:py-10">
        <div className="flex flex-col gap-4 rounded-sm border border-dashed border-line-strong p-4">
          <p className="label-caps text-small text-fg-muted">{t.eyebrow}</p>
          <div className="grid gap-3 tablet:grid-cols-[2fr_1fr_auto] tablet:items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={accountId} className="text-small font-medium">
                {t.account}
              </label>
              <select id={accountId} className={inputClass} value={staff.id} onChange={(e) => onChoose(e.target.value)}>
                {SAMPLE_STAFF.map((s) => (
                  <option key={s.id} value={s.id}>
                    {t.accountLabel(staffCopy.roles[s.role], placeOf(s, outlets))}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={scopeId} className="text-small font-medium">
                {t.scope}
              </label>
              <select
                id={scopeId}
                className={inputClass}
                value={scope}
                disabled={mine.length < 2}
                onChange={(e) => setScope(e.target.value as OutletScope)}
              >
                {mine.length > 1 && <option value="all">{t.allOutlets}</option>}
                {mine.map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="secondary" onClick={() => onChoose(null)}>
              {t.signOut}
            </Button>
          </div>
        </div>

        <nav aria-label={t.nav.label} className="-mx-1 overflow-x-auto px-1 pb-1">
          <ul className="flex gap-2">
            {sections.map((s) => (
              <li key={s} className="shrink-0">
                <Link
                  href={routes.adminSection(s)}
                  aria-current={s === section ? "page" : undefined}
                  className={cx(
                    "inline-flex min-h-11 items-center rounded-full border px-4 text-small font-medium whitespace-nowrap",
                    s === section
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line-strong text-fg hover-fine:border-accent",
                  )}
                >
                  {t.nav[s]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {sections.includes(section) ? (
          children
        ) : (
          <p role="alert" className="rounded-sm border border-line p-4">
            {t.forbidden}
          </p>
        )}
      </div>
    </AdminContext.Provider>
  );
}
