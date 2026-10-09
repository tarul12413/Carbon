"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { bookableDates } from "@/domain/booking/availability";
import {
  isFlowStep,
  previousStep,
  reachableStep,
  stepNumber,
  updateDraft,
  type Details,
  type Draft,
  type FlowStep,
} from "@/domain/booking/flow";
import { holdMsLeft } from "@/domain/booking/hold";
import type { Booking } from "@/domain/booking/schema";
import type { BookingSettings } from "@/domain/booking/settings";
import { isOutletSlug, type OutletSlug } from "@/domain/outlet";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { useNow } from "@/lib/useNow";
import type { BookingResult } from "@/services/bookings";
import type { ServiceError } from "@/services/errors";
import { clientServices } from "@/services/client";
import { DetailsStep, type FieldErrors } from "./DetailsStep";
import { FlowFrame, OutletChoices, type FlowOutlet } from "./FlowFrame";
import { whenShort } from "./format";
import { HoldTimer } from "./HoldTimer";
import { PartyStep } from "./PartyStep";
import { RequestStep, ReviewStep, type RequestFields } from "./ReviewStep";
import { SlotPicker } from "./SlotPicker";
import { StepHeader } from "./StepHeader";
import { clearDraft, useDraft } from "./useDraft";

const t = copy.booking;
const service = clientServices.bookings;

export type BookingOutlet = FlowOutlet;

interface BookingFlowProps {
  readonly outlets: readonly BookingOutlet[];
  readonly settings: Readonly<Record<OutletSlug, BookingSettings>>;
}

type Problem = ServiceError | { readonly code: "network" };
type Outcome<T> = BookingResult<T> | { readonly ok: false; readonly error: { readonly code: "network" } };

const network = (): Outcome<never> => ({ ok: false, error: { code: "network" } });

/**
 * Steps one to five of the booking flow. Renders on the client only (it sits under a Suspense
 * boundary and reads the URL), so it can read the saved draft on first render.
 */
export function BookingFlow({ outlets, settings }: BookingFlowProps) {
  const router = useRouter();
  const params = useSearchParams();
  const keyFor = useIdempotencyKey();
  const linkedOutlet = params.get("outlet");

  const [draft, setDraft] = useDraft((saved) =>
    isOutletSlug(linkedOutlet) && linkedOutlet !== saved.outlet ? updateDraft(saved, { outlet: linkedOutlet }) : saved,
  );
  const wanted = params.get("step");
  const step = reachableStep(isFlowStep(wanted) ? wanted : isOutletSlug(linkedOutlet) ? "time" : "outlet", draft);

  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [requestErrors, setRequestErrors] = useState<Partial<Record<keyof RequestFields, string>>>({});
  const [held, setHeld] = useState<Booking | null>(null);
  const [expired, setExpired] = useState(false);
  const [partyFits, setPartyFits] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const heldKey = useRef<string | null>(null);

  const outlet = outlets.find((o) => o.slug === draft.outlet);
  const outletSettings = settings[draft.outlet ?? "c-scheme"];

  const go = useCallback((next: FlowStep) => {
    setProblem(null);
    window.history.pushState(null, "", `?step=${next}`);
  }, []);

  const release = useCallback(
    (code: string) => {
      void service.cancel(code, keyFor({ op: "release", code })).catch(() => undefined);
    },
    [keyFor],
  );

  const update = (change: Partial<Omit<Draft, "details">>) => {
    const next = updateDraft(draft, change);
    if (draft.code && !next.code) {
      release(draft.code);
      setHeld(null);
      setExpired(false);
    }
    setDraft(next);
  };
  const updateDetails = (change: Partial<Details>) => setDraft((d) => ({ ...d, details: { ...d.details, ...change } }));

  /** Resume a hold from its booking page (/book?resume=CRB-1234). */
  const resume = params.get("resume");
  useEffect(() => {
    if (!resume) return;
    let live = true;
    service.getBooking(resume).then((result) => {
      if (!live || !result.ok || result.value.status !== "held") return;
      const b = result.value;
      setDraft((d) => ({
        ...d,
        outlet: b.outlet,
        date: b.date,
        time: b.time,
        partySize: b.partySize,
        code: b.code,
        details: { ...d.details, name: b.name, phone: b.phone, note: b.note, privacyAccepted: true },
      }));
      window.history.replaceState(null, "", "?step=review");
    });
    return () => {
      live = false;
    };
  }, [resume, setDraft]);

  /** Load the live hold for the review step. */
  useEffect(() => {
    if (step !== "review" || !draft.code) return;
    let live = true;
    service.getBooking(draft.code).then((result) => {
      if (!live) return;
      if (result.ok && result.value.status === "held") setHeld(result.value);
      else setExpired(true);
    });
    return () => {
      live = false;
    };
  }, [step, draft.code]);

  const run = async <T,>(work: () => Promise<BookingResult<T>>): Promise<Outcome<T>> => {
    inFlight.current = true;
    setBusy(true);
    setProblem(null);
    try {
      return await work().catch(() => network());
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const submitDetails = async (honeypot: string) => {
    if (inFlight.current || !draft.outlet || !draft.date || !draft.time) return;
    const input = {
      outlet: draft.outlet,
      date: draft.date,
      time: draft.time,
      partySize: draft.partySize,
      ...draft.details,
      noticeVersion: placeholders.noticeVersion.value,
      website: honeypot,
    };
    const key = keyFor(input);
    if (draft.code) {
      const unchanged = key === heldKey.current && held?.status === "held" && holdMsLeft(held, new Date()) > 0;
      if (unchanged) return go("review");
      release(draft.code);
    }
    /* The service checks every field; the form shows what it sends back. */
    const result = await run(() => service.createHold(input, key));
    if (result.ok) {
      heldKey.current = key;
      setFieldErrors({});
      setHeld(result.value);
      setExpired(false);
      setDraft((d) => ({ ...d, code: result.value.code }));
      go("review");
      return;
    }
    const fields = "fields" in result.error ? (result.error.fields ?? {}) : {};
    setFieldErrors(fields as FieldErrors);
    if (result.error.code !== "invalid_input") setProblem(result.error);
    if (result.error.code === "slot_full") setRefresh((n) => n + 1);
  };

  const confirm = async (payment: "cafe" | "online") => {
    if (inFlight.current || !held) return;
    if (payment === "online") {
      const input = { bookingCode: held.code };
      const order = await run(() =>
        clientServices.ticketing.createDepositOrder(input, keyFor({ op: "deposit", ...input })),
      );
      if (order.ok) router.push(routes.checkout(order.value.id));
      else if (order.error.code === "hold_expired") setExpired(true);
      else setProblem(order.error);
      return;
    }
    const result = await run(() =>
      service.confirm(held.code, { payment: "cafe" }, keyFor({ op: "confirm", code: held.code })),
    );
    if (result.ok) return finish(result.value.code);
    if (result.error.code === "hold_expired") setExpired(true);
    else setProblem(result.error);
  };

  const sendRequest = async (fields: RequestFields) => {
    if (inFlight.current || !held) return;
    const result = await run(() =>
      service.sendRequest(held.code, fields, keyFor({ op: "request", code: held.code, fields })),
    );
    if (result.ok) return finish(result.value.code);
    setRequestErrors("fields" in result.error ? (result.error.fields ?? {}) : {});
    if (result.error.code === "hold_expired") setExpired(true);
    else if (result.error.code !== "invalid_input") setProblem(result.error);
  };

  const finish = (code: string) => {
    clearDraft();
    router.push(`/book/${code}`);
  };

  const recheck = () => {
    update({ time: undefined });
    go("time");
  };

  const back = previousStep(step);
  const isRequest = held?.kind === "request";
  const title: Record<FlowStep, ReactNode> = {
    outlet: t.steps.outlet,
    time: t.steps.time,
    party: t.steps.party,
    details: t.steps.details,
    review: isRequest && held ? t.steps.request(held.partySize) : t.steps.review,
  };
  const dates = bookableDates(new Date(), site.timeZone, outletSettings);
  const chosen = [outlet?.name, draft.date && draft.time ? whenShort(draft.date, draft.time) : undefined]
    .filter(Boolean)
    .join(", ");

  let body: ReactNode;
  let action: ReactNode = null;
  if (step === "outlet") {
    body = <OutletChoices outlets={outlets} selected={draft.outlet} onSelect={(slug) => update({ outlet: slug })} />;
    action = (
      <Button onClick={() => go("time")} disabled={!draft.outlet}>
        {t.continue}
      </Button>
    );
  } else if (step === "time" && draft.outlet) {
    body = (
      <SlotPicker
        service={service}
        outlet={draft.outlet}
        partySize={draft.partySize}
        dates={dates}
        date={draft.date}
        time={draft.time}
        refresh={refresh}
        onChange={(next) => update(next)}
      />
    );
    action = (
      <Button onClick={() => go("party")} disabled={!draft.time}>
        {t.continue}
      </Button>
    );
  } else if (step === "party" && draft.outlet && draft.date && draft.time) {
    body = (
      <PartyStep
        service={service}
        settings={outletSettings}
        outlet={draft.outlet}
        date={draft.date}
        time={draft.time}
        partySize={draft.partySize}
        onChange={(partySize) => update({ partySize })}
        onPickTime={() => go("time")}
        onFitChange={setPartyFits}
      />
    );
    action = (
      <Button onClick={() => go("details")} disabled={!partyFits}>
        {t.continue}
      </Button>
    );
  } else if (step === "details") {
    body = (
      <DetailsStep
        details={draft.details}
        errors={fieldErrors}
        busy={busy}
        holdMinutes={outletSettings.holdMinutes}
        onChange={updateDetails}
        onSubmit={submitDetails}
      />
    );
  } else if (step === "review") {
    if (expired) {
      body = (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-sm border border-danger p-5">
          <p className="text-h3 font-semibold">{t.hold.expiredTitle}</p>
          <p className="text-fg-muted">{t.hold.expiredBody}</p>
          <Button onClick={recheck}>{t.hold.recheck}</Button>
        </div>
      );
    } else if (held && outlet) {
      body = (
        <div className="flex flex-col gap-6">
          <LiveHold booking={held} onExpire={() => setExpired(true)} />
          {isRequest ? (
            <RequestStep
              booking={held}
              outletName={outlet.name}
              busy={busy}
              errors={requestErrors}
              onSend={sendRequest}
            />
          ) : (
            <ReviewStep booking={held} outletName={outlet.name} busy={busy} onConfirm={confirm} />
          )}
        </div>
      );
    } else {
      body = <p className="text-fg-muted">{t.loadingSlots}</p>;
    }
  }

  return (
    <FlowFrame
      header={
        <StepHeader step={stepNumber(step)} title={title[step]} onBack={back ? () => go(back) : undefined}>
          {chosen && step !== "outlet" && step !== "review" && <p className="text-fg-muted tablet:hidden">{chosen}</p>}
        </StepHeader>
      }
      action={action}
      summary={{
        outlet: outlet?.name,
        when: draft.date && draft.time ? whenShort(draft.date, draft.time) : undefined,
        party: step === "outlet" || step === "time" ? undefined : String(draft.partySize),
      }}
    >
      {problem && <ProblemNotice problem={problem} onPick={(alt) => update(alt)} />}
      {body}
    </FlowFrame>
  );
}

function LiveHold({ booking, onExpire }: { readonly booking: Booking; readonly onExpire: () => void }) {
  const now = useNow(1000);
  if (!now) return null;
  return <HoldTimer msLeft={holdMsLeft(booking, now)} onExpire={onExpire} />;
}

function ProblemNotice({
  problem,
  onPick,
}: {
  readonly problem: Problem;
  readonly onPick: (slot: { date: string; time: string }) => void;
}) {
  const alternatives = "alternatives" in problem ? (problem.alternatives ?? []) : [];
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-sm border border-danger p-4">
      <p>{t.errors[problem.code]}</p>
      {alternatives.length > 0 && (
        <>
          <p className="text-fg-muted">{t.alternatives}</p>
          <div className="flex flex-wrap gap-2">
            {alternatives.map((alt) => (
              <button
                key={`${alt.date}-${alt.time}`}
                type="button"
                onClick={() => onPick(alt)}
                className="min-h-11 rounded-full border border-accent px-4 font-mono text-small text-accent"
              >
                {whenShort(alt.date, alt.time)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
