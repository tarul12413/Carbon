"use client";

import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { whenShort } from "@/components/booking/format";
import { jaipurParts, type TicketEvent } from "@/components/tickets/TicketView";
import { Button } from "@/components/ui/Button";
import { DigitBoxes } from "@/components/ui/DigitBoxes";
import { TextField, inputClass } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { site } from "@/config/site";
import type { OutletSlug } from "@/domain/outlet";
import { SAMPLE_STAFF, staffById, staffCan, type StaffActor } from "@/domain/staff";
import { localDate } from "@/domain/time";
import { cx } from "@/lib/cx";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { useNow } from "@/lib/useNow";
import { clientServices } from "@/services/client";
import type { ServiceError } from "@/services/errors";
import type { DoorView, StaffCardView } from "@/services/staff";
import { StampGrid } from "./StampGrid";

const t = copy.staff;
const service = clientServices.staff;
const ACCOUNT_KEY = "carbon-demo:staff";
const PIN_DIGITS = 4;

export interface ScannerOutlet {
  readonly slug: OutletSlug;
  readonly name: string;
}

interface StaffScannerProps {
  readonly outlets: readonly ScannerOutlet[];
  readonly events: readonly TicketEvent[];
  /** The stamp card mode exists only with the feature flag on. */
  readonly stampCard: boolean;
  readonly devPanel: boolean;
}

type Mode = "stamps" | "door";

const problemText = (error: ServiceError | "network"): string => {
  if (error === "network") return copy.booking.errors.network;
  const staffText = (t.errors as Partial<Record<string, string>>)[error.code];
  return staffText ?? copy.booking.errors[error.code];
};

const time = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: site.timeZone }).format(
    new Date(iso),
  );

function ago(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return t.ago.now;
  if (minutes < 60) return t.ago.minutes(minutes);
  if (minutes < 24 * 60) return t.ago.hours(Math.floor(minutes / 60));
  return t.ago.days(Math.floor(minutes / (24 * 60)));
}

/** Remembers the sample account and outlet on this device. */
function useAccount(outlets: readonly ScannerOutlet[]) {
  const fallback: StaffActor = { staffId: "stf-barista-c-scheme", outlet: outlets[0]?.slug ?? "c-scheme" };
  const [actor, setActor] = useState<StaffActor>(fallback);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(ACCOUNT_KEY) ?? "null") as StaffActor | null;
      const staff = staffById(saved?.staffId);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading this device's saved account after hydration
      if (saved && staff?.outlets.includes(saved.outlet)) setActor(saved);
    } catch {
      /* Nothing saved, or storage blocked: keep the default account. */
    }
  }, []);
  const choose = (next: StaffActor) => {
    setActor(next);
    try {
      window.localStorage.setItem(ACCOUNT_KEY, JSON.stringify(next));
    } catch {
      /* Storage blocked: the choice lasts as long as this page. */
    }
  };
  return [actor, choose] as const;
}

/** /staff: the barista's scanner (wireframe 11) and the event door. Mock sign-in, mock camera. */
export function StaffScanner({ outlets, events, stampCard, devPanel }: StaffScannerProps) {
  const [actor, setActor] = useAccount(outlets);
  const [mode, setMode] = useState<Mode>(stampCard ? "stamps" : "door");
  const staff = staffById(actor.staffId);
  const outletName = (slug: OutletSlug) => outlets.find((o) => o.slug === slug)?.name ?? slug;
  const accountId = useId();
  const outletId = useId();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-sm border border-dashed border-line-strong p-4">
        <div className="grid gap-3 tablet:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={accountId} className="text-small font-medium">
              {t.account}
            </label>
            <select
              id={accountId}
              className={inputClass}
              value={actor.staffId}
              onChange={(e) => {
                const next = staffById(e.target.value);
                if (!next) return;
                const outlet = next.outlets.includes(actor.outlet) ? actor.outlet : (next.outlets[0] ?? actor.outlet);
                setActor({ staffId: next.id, outlet });
              }}
            >
              {SAMPLE_STAFF.map((s) => (
                <option key={s.id} value={s.id}>
                  {t.roles[s.role]}, {s.outlets.length > 1 ? t.allOutlets : outletName(s.outlets[0] ?? "c-scheme")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={outletId} className="text-small font-medium">
              {t.outlet}
            </label>
            <select
              id={outletId}
              className={inputClass}
              value={actor.outlet}
              onChange={(e) => setActor({ ...actor, outlet: e.target.value as OutletSlug })}
            >
              {outlets
                .filter((o) => staff?.outlets.includes(o.slug))
                .map((o) => (
                  <option key={o.slug} value={o.slug}>
                    {o.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <p className="text-small text-fg-muted">{t.accountNote}</p>
      </div>

      {stampCard && (
        <div role="group" aria-label={t.mode} className="grid grid-cols-2 gap-2 rounded-sm border border-line p-1">
          {(["stamps", "door"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cx(
                "min-h-11 rounded-sm font-medium",
                mode === m ? "bg-accent text-on-accent" : "text-fg-muted hover-fine:text-fg",
              )}
            >
              {t.modes[m]}
            </button>
          ))}
        </div>
      )}

      {mode === "stamps" && stampCard ? (
        <StampDesk key={`${actor.staffId}:${actor.outlet}`} actor={actor} devPanel={devPanel} />
      ) : (
        <Door key={`${actor.staffId}:${actor.outlet}`} actor={actor} events={events} />
      )}
    </div>
  );
}

/* The camera stand-in, shared by both modes */

function ScanPanel({
  title,
  point,
  onSimulate,
  typeLabel,
  typeField,
  busy,
}: {
  readonly title: string;
  readonly point: string;
  readonly onSimulate: () => void;
  readonly typeLabel: string;
  readonly typeField: (close: () => void) => ReactNode;
  readonly busy: boolean;
}) {
  const [typing, setTyping] = useState(false);
  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-display font-semibold">{title}</h1>
      <div className="relative mx-auto flex aspect-square w-full max-w-80 flex-col items-center justify-center gap-2 rounded-sm bg-surface-raised p-6 text-center">
        {(
          [
            "top-0 left-0 border-t-4 border-l-4",
            "top-0 right-0 border-t-4 border-r-4",
            "bottom-0 left-0 border-b-4 border-l-4",
            "bottom-0 right-0 border-b-4 border-r-4",
          ] as const
        ).map((corner) => (
          <span key={corner} aria-hidden="true" className={cx("absolute size-10 border-accent", corner)} />
        ))}
        <p className="label-caps text-small text-fg-muted">{t.camera}</p>
        <p className="max-w-56 text-small text-fg-muted">{t.cameraNote}</p>
      </div>
      <p className="text-center text-fg-muted">{point}</p>
      <Button onClick={onSimulate} disabled={busy} className="w-full">
        {t.simulate}
      </Button>
      {typing ? (
        typeField(() => setTyping(false))
      ) : (
        <Button variant="secondary" onClick={() => setTyping(true)} className="w-full">
          {typeLabel}
        </Button>
      )}
    </div>
  );
}

function LookupForm({
  label,
  type,
  onFind,
  busy,
}: {
  readonly label: string;
  readonly type: "tel" | "text";
  readonly onFind: (value: string) => void;
  readonly busy: boolean;
}) {
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) onFind(value);
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <TextField
        label={label}
        type={type}
        inputMode={type === "tel" ? "tel" : "text"}
        autoComplete="off"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={type === "text" ? "font-mono uppercase" : undefined}
      />
      <Button type="submit" variant="secondary" disabled={busy}>
        {t.find}
      </Button>
    </form>
  );
}

function Alert({ problem, notice }: { readonly problem: string | null; readonly notice: string | null }) {
  return (
    <>
      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <p role="status" className={notice ? "text-success" : "sr-only"}>
        {notice}
      </p>
    </>
  );
}

/* Stamp card mode */

function StampDesk({ actor, devPanel }: { readonly actor: StaffActor; readonly devPanel: boolean }) {
  const [card, setCard] = useState<StaffCardView | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const keyFor = useIdempotencyKey();
  const now = useNow(15_000);
  const staff = staffById(actor.staffId);
  const allowed = staff ? staffCan(staff, "stamp", actor.outlet) : false;

  const run = async <T,>(work: () => Promise<{ ok: true; value: T } | { ok: false; error: ServiceError }>) => {
    setBusy(true);
    setProblem(null);
    setNotice(null);
    try {
      const result = await work();
      if (result.ok) return result.value;
      setProblem(problemText(result.error));
    } catch {
      setProblem(problemText("network"));
    } finally {
      setBusy(false);
    }
    return null;
  };

  const find = async (lookup: { token: string } | { phone: string }) => {
    const found = await run(() => service.findCard(actor, lookup));
    if (found) setCard(found);
  };

  const simulate = async () => {
    const { stamp } = await clientServices.demo.scannable();
    if (stamp) await find({ token: stamp });
    else setProblem(t.nothingCard);
  };

  if (!allowed) return <p className="text-fg-muted">{t.errors.forbidden}</p>;

  if (!card) {
    return (
      <div className="flex flex-col gap-4">
        <ScanPanel
          title={t.scanCard}
          point={t.pointCard}
          onSimulate={simulate}
          typeLabel={t.phoneInstead}
          busy={busy}
          typeField={() => <LookupForm label={t.phone} type="tel" busy={busy} onFind={(phone) => find({ phone })} />}
        />
        <Alert problem={problem} notice={notice} />
      </div>
    );
  }

  const who = card.name ?? card.phoneMasked;

  /* Optimistic: the stamp shows at once and quietly rolls back if the server says no (Blueprint 8). */
  const addStamp = async () => {
    const before = card;
    setCard({ ...card, stamps: card.stamps + 1 });
    const result = await run(() =>
      service.addStamp(
        actor,
        card.customerId,
        keyFor({ op: "stamp", customer: card.customerId, at: card.lastStampAt }),
      ),
    );
    if (result) {
      setCard(result);
      setNotice(t.added(result.stamps, result.threshold));
      if ("vibrate" in navigator) navigator.vibrate(40);
    } else setCard(before);
  };

  const undo = async () => {
    if (!card.undo) return;
    const entryId = card.undo.entryId;
    const result = await run(() => service.undoStamp(actor, entryId, keyFor({ op: "undo", entryId })));
    if (result) {
      setCard(result);
      setNotice(t.undone);
    }
  };

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    const result = await run(() =>
      service.redeem(actor, card.customerId, pin, keyFor({ op: "redeem", customer: card.customerId, pin })),
    );
    setPin("");
    if (result) {
      setCard(result);
      setNotice(t.redeemed);
    }
  };

  if (card.rewardReady) {
    return (
      <form onSubmit={redeem} className="flex flex-col items-center gap-5 text-center">
        <span className="flex size-20 items-center justify-center rounded-full bg-accent font-mono text-display font-semibold text-on-accent">
          {card.threshold}
        </span>
        <h1 className="text-display font-semibold">{t.readyTitle}</h1>
        <p className="text-fg-muted">{t.readySub(who, card.stamps, card.threshold)}</p>
        <div className="flex w-full flex-col items-center gap-3 rounded-sm border border-line bg-surface-raised p-5">
          <DigitBoxes
            length={PIN_DIGITS}
            value={pin}
            onChange={setPin}
            label={t.pin}
            digitLabel={copy.stampCard.digit}
            secret
            autoFocus
          />
          <p className="text-small text-fg-muted" aria-hidden="true">
            {t.pin}
          </p>
        </div>
        <Alert problem={problem} notice={notice} />
        <Button type="submit" disabled={busy || pin.length !== PIN_DIGITS} className="w-full">
          {t.redeem}
        </Button>
        <p className="text-small text-fg-muted">{t.logged}</p>
        {devPanel && <p className="font-mono text-small text-fg-muted">{t.pinHint(placeholders.outletPin.value)}</p>}
        <Button variant="quiet" onClick={() => setCard(null)}>
          {t.scanAnother}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-h1 font-semibold">{who}</h1>
        {card.name && <p className="font-mono text-fg-muted">{card.phoneMasked}</p>}
      </div>
      <div className="flex flex-col gap-3 rounded-sm border border-line bg-surface-raised p-5">
        <p className="text-fg-muted">{t.card}</p>
        <p className="text-display font-semibold text-accent">{t.count(card.stamps, card.threshold)}</p>
        <StampGrid
          stamps={card.stamps}
          threshold={card.threshold}
          label={copy.stampCard.cardLabel(card.stamps, card.threshold)}
          size="small"
        />
      </div>
      <p className="self-start rounded-full border border-accent px-4 py-2 text-accent">
        {card.lastStampAt && now ? t.lastStamp(ago(card.lastStampAt, now)) : t.firstStamp}
      </p>
      {card.nextStampAt && <p className="text-fg-muted">{t.nextFrom(time(card.nextStampAt))}</p>}
      <Alert problem={problem} notice={notice} />
      <Button onClick={addStamp} disabled={busy || Boolean(card.nextStampAt)} className="w-full">
        <Icon name="plus" />
        {t.add}
      </Button>
      {card.undo && (
        <Button variant="secondary" onClick={undo} disabled={busy} className="w-full">
          {t.undo}
        </Button>
      )}
      <Button variant="quiet" onClick={() => setCard(null)}>
        {t.scanAnother}
      </Button>
    </div>
  );
}

/* Event door mode */

function Door({ actor, events }: { readonly actor: StaffActor; readonly events: readonly TicketEvent[] }) {
  const [view, setView] = useState<DoorView | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const keyFor = useIdempotencyKey();
  const now = useNow(60_000);
  const staff = staffById(actor.staffId);
  const allowed = staff ? staffCan(staff, "checkIn", actor.outlet) : false;

  const find = async (lookup: { token: string } | { code: string }) => {
    setBusy(true);
    setProblem(null);
    setNotice(null);
    try {
      const result = await service.findTicket(actor, lookup);
      if (result.ok) setView(result.value);
      else setProblem(problemText(result.error));
    } catch {
      setProblem(problemText("network"));
    } finally {
      setBusy(false);
    }
  };

  const simulate = async () => {
    const { ticket } = await clientServices.demo.scannable();
    if (ticket) await find({ token: ticket });
    else setProblem(t.nothingTicket);
  };

  const checkIn = async (collected: boolean) => {
    if (!view) return;
    setBusy(true);
    setProblem(null);
    try {
      const code = view.ticket.code;
      const result = await service.checkIn(actor, code, collected, keyFor({ op: "check-in", code, collected }));
      if (result.ok) {
        setView(result.value);
        setNotice(t.door.checkedIn);
      } else setProblem(problemText(result.error));
    } catch {
      setProblem(problemText("network"));
    } finally {
      setBusy(false);
    }
  };

  if (!allowed) return <p className="text-fg-muted">{t.errors.forbidden}</p>;

  if (!view) {
    return (
      <div className="flex flex-col gap-4">
        <ScanPanel
          title={t.scanTicket}
          point={t.pointTicket}
          onSimulate={simulate}
          typeLabel={t.codeInstead}
          busy={busy}
          typeField={() => (
            <LookupForm label={t.ticketCode} type="text" busy={busy} onFind={(code) => find({ code })} />
          )}
        />
        <Alert problem={problem} notice={notice} />
      </div>
    );
  }

  const { ticket, order } = view;
  const event = events.find((e) => e.slug === ticket.eventSlug);
  const { date, time: at } = jaipurParts(order.startsAt);
  const valid = ticket.status === "valid" && (order.status === "paid" || order.status === "reserved");
  const today = now ? localDate(now, site.timeZone) : date;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-h2 font-medium text-accent">{ticket.code}</p>
        <h1 className="text-h1 font-semibold text-balance">
          {event?.title} x {ticket.quantity}
        </h1>
        <p className="text-fg-muted">
          {whenShort(date, at)}, {event?.outletName}
        </p>
      </div>
      <p className="self-start rounded-full border border-line-strong px-4 py-2 font-mono">
        {t.door.admits(ticket.quantity)}
      </p>

      {!valid && <p className="text-danger">{t.door.notValid}</p>}
      {valid && ticket.checkedInAt && !notice && (
        <p className="flex items-center gap-2 text-danger">
          <Icon name="close" />
          {t.door.already(time(ticket.checkedInAt))}
        </p>
      )}
      {valid && !ticket.checkedInAt && (
        <>
          <p className={view.paid ? "text-success" : "text-accent"}>
            {view.paid ? t.door.paid : `${t.door.unpaid} (${placeholders.ticketPriceLabel.value})`}
          </p>
          {date !== today && <p className="text-fg-muted">{t.door.otherDay(whenShort(date, at))}</p>}
        </>
      )}
      <Alert problem={problem} notice={notice} />
      {valid && !ticket.checkedInAt && (
        <Button onClick={() => checkIn(!view.paid)} disabled={busy} className="w-full">
          {view.paid ? t.door.checkIn(ticket.quantity) : t.door.collect}
        </Button>
      )}
      <Button variant={ticket.checkedInAt ? "primary" : "quiet"} onClick={() => setView(null)}>
        {t.scanAnother}
      </Button>
    </div>
  );
}
