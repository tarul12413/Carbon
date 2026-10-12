"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { TicketQr } from "@/components/tickets/TicketQr";
import { Button } from "@/components/ui/Button";
import { DigitBoxes } from "@/components/ui/DigitBoxes";
import { Checkbox, TextField } from "@/components/ui/Field";
import { Tbc } from "@/components/ui/Tbc";
import { copy } from "@/content/copy";
import { placeholders } from "@/config/placeholders";
import { routes } from "@/config/routes";
import { OTP_DIGITS } from "@/domain/loyalty/schema";
import type { OutletSlug } from "@/domain/outlet";
import { useIdempotencyKey } from "@/lib/useIdempotencyKey";
import { useNow } from "@/lib/useNow";
import { clientServices } from "@/services/client";
import type { ServiceError } from "@/services/errors";
import type { OtpChallengeView, StampCard as Card, StampQr } from "@/services/loyalty";
import { StampGrid } from "./StampGrid";

const t = copy.stampCard;
const service = clientServices.loyalty;
const SESSION_KEY = "carbon-demo:session";
const POLL_MS = 3_000;

/** Demo: the session id lives in this browser. Phase 2 keeps it in an HTTP-only cookie. */
const savedSession = {
  read: () => {
    try {
      return window.localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  },
  write: (id: string | null) => {
    try {
      if (id) window.localStorage.setItem(SESSION_KEY, id);
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* Storage blocked: the session lasts as long as this page. */
    }
  },
};

const errorText = (error: ServiceError | "network"): string => {
  if (error === "network") return copy.booking.errors.network;
  return copy.booking.errors[error.code];
};

type Stage =
  | { readonly name: "loading" }
  | { readonly name: "phone"; readonly notice?: string }
  | { readonly name: "code"; readonly challenge: OtpChallengeView; readonly phone: string }
  | { readonly name: "card"; readonly session: string; readonly card: Card };

interface MyCarbonProps {
  readonly outletNames: Readonly<Record<OutletSlug, string>>;
  /** Show the mock SMS code in a toast (dev panel flag). */
  readonly devPanel: boolean;
}

/** /my-carbon: phone, code, card (wireframe 09). Behind the stampCard flag. */
export function MyCarbon({ outletNames, devPanel }: MyCarbonProps) {
  const [stage, setStage] = useState<Stage>({ name: "loading" });
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const session = savedSession.read();
    let live = true;
    (session ? service.getCard(session) : Promise.resolve(null))
      .then((r) => {
        if (!live) return;
        if (session && r?.ok) setStage({ name: "card", session, card: r.value });
        else {
          savedSession.write(null);
          setStage({ name: "phone" });
        }
      })
      .catch(() => live && setStage({ name: "phone" }));
    return () => {
      live = false;
    };
  }, []);

  const go = (next: Stage) => {
    setStage(next);
    requestAnimationFrame(() => heading.current?.focus());
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 ref={heading} tabIndex={-1} className="text-display font-semibold text-balance outline-none">
          {stage.name === "code" ? t.codeTitle : t.title}
        </h1>
        {stage.name === "phone" && <p className="text-h3 text-fg-muted">{t.lead}</p>}
        {stage.name === "code" && <p className="text-h3 text-fg-muted">{t.sentTo(stage.challenge.phoneMasked)}</p>}
      </div>

      {stage.name === "loading" && <p className="text-fg-muted">{t.loading}</p>}
      {stage.name === "phone" && (
        <PhoneStep
          notice={stage.notice}
          onSent={(challenge, phone) => go({ name: "code", challenge, phone })}
          devPanel={devPanel}
        />
      )}
      {stage.name === "code" && (
        <CodeStep
          challenge={stage.challenge}
          phone={stage.phone}
          devPanel={devPanel}
          onResent={(challenge) => setStage({ ...stage, challenge })}
          onBack={() => go({ name: "phone" })}
          onSignedIn={(session, card) => {
            savedSession.write(session);
            go({ name: "card", session, card });
          }}
        />
      )}
      {stage.name === "card" && (
        <CardStep
          session={stage.session}
          card={stage.card}
          outletNames={outletNames}
          onCard={(card) => setStage({ ...stage, card })}
          onLeave={(notice) => {
            savedSession.write(null);
            go({ name: "phone", notice });
          }}
        />
      )}
    </div>
  );
}

/* Step 1: phone and consent */

function PhoneStep({
  notice,
  onSent,
  devPanel,
}: {
  readonly notice?: string;
  readonly onSent: (challenge: OtpChallengeView, phone: string) => void;
  readonly devPanel: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [fields, setFields] = useState<Readonly<Record<string, string>>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const keyFor = useIdempotencyKey();
  const whyId = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const input = { phone, privacyAccepted: agreed, noticeVersion: placeholders.noticeVersion.value, website };
    try {
      const result = await service.requestOtp(input, keyFor(input));
      if (result.ok) {
        setFields({});
        onSent(result.value, phone);
      } else if (result.error.code === "invalid_input") setFields(result.error.fields ?? {});
      else {
        setFields({});
        setProblem(
          result.error.code === "rate_limited" && result.error.retryAt
            ? `${errorText(result.error)} ${t.tryAfter(clock(result.error.retryAt))}`
            : errorText(result.error),
        );
      }
    } catch {
      setProblem(errorText("network"));
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key: string) =>
    fields[key] ? (t.errors[fields[key] as keyof typeof t.errors] ?? copy.booking.errors.invalid_input) : undefined;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-5">
      {notice && (
        <p role="status" className="text-success">
          {notice}
        </p>
      )}
      <div className="flex items-end gap-2">
        <span className="flex min-h-12 items-center rounded-sm border border-line-strong bg-surface-raised px-3.5 font-mono">
          +91
        </span>
        <div className="min-w-0 flex-1">
          <TextField
            label={t.phone}
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldError("phone")}
            aria-describedby={whyId}
            required
          />
        </div>
      </div>

      <div id={whyId} className="flex flex-col gap-1 rounded-sm border border-line bg-surface-raised p-4">
        <p className="font-semibold">{t.whyTitle}</p>
        <p className="text-fg-muted">{t.whyBody}</p>
        <Link href={routes.legal} className="inline-flex min-h-11 items-center self-start text-accent">
          {t.notice} <span aria-hidden="true">&nbsp;›</span>
        </Link>
      </div>

      <Checkbox
        label={
          <>
            {t.agree} <span className="text-small text-fg-muted">({placeholders.noticeVersion.value})</span>
          </>
        }
        checked={agreed}
        onChange={(e) => setAgreed(e.target.checked)}
        error={fieldError("privacyAccepted")}
      />
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

      {problem && (
        <p role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <Button type="submit" disabled={busy} className="w-full tablet:w-auto tablet:self-start">
        {busy ? t.sending : t.send}
      </Button>
      {devPanel && <p className="text-small text-fg-muted">{t.demoNote}</p>}
    </form>
  );
}

/* Step 2: the code */

function CodeStep({
  challenge,
  phone,
  devPanel,
  onResent,
  onBack,
  onSignedIn,
}: {
  readonly challenge: OtpChallengeView;
  readonly phone: string;
  readonly devPanel: boolean;
  readonly onResent: (challenge: OtpChallengeView) => void;
  readonly onBack: () => void;
  readonly onSignedIn: (session: string, card: Card) => void;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [toast, setToast] = useState(true);
  const keyFor = useIdempotencyKey();
  const now = useNow(1000);
  const problemId = useId();
  const resendIn = now ? Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - now.getTime()) / 1000)) : 0;

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (code.length !== OTP_DIGITS) {
      setProblem(t.errors["code.format"]);
      return;
    }
    setBusy(true);
    setProblem(null);
    const input = { challengeId: challenge.challengeId, code };
    try {
      const result = await service.verifyOtp(input, keyFor(input));
      if (result.ok) onSignedIn(result.value.session, result.value.card);
      else {
        const e = result.error;
        setProblem(
          e.code === "otp_invalid" && e.attemptsLeft ? `${errorText(e)} ${t.triesLeft(e.attemptsLeft)}` : errorText(e),
        );
        setCode("");
      }
    } catch {
      setProblem(errorText("network"));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setProblem(null);
    const input = { phone, privacyAccepted: true, noticeVersion: placeholders.noticeVersion.value, website: "" };
    try {
      const result = await service.requestOtp(input, keyFor({ ...input, at: challenge.challengeId }));
      if (result.ok) {
        setCode("");
        setToast(true);
        onResent(result.value);
      } else {
        setProblem(
          result.error.code === "rate_limited" && result.error.retryAt
            ? `${errorText(result.error)} ${t.tryAfter(clock(result.error.retryAt))}`
            : errorText(result.error),
        );
      }
    } catch {
      setProblem(errorText("network"));
    }
  };

  return (
    <form noValidate onSubmit={verify} className="flex flex-col gap-5">
      <DigitBoxes
        length={OTP_DIGITS}
        value={code}
        onChange={setCode}
        label={t.codeGroup}
        digitLabel={t.digit}
        autoComplete="one-time-code"
        invalid={Boolean(problem)}
        describedBy={problem ? problemId : undefined}
        autoFocus
      />
      {problem && (
        <p id={problemId} role="alert" className="text-danger">
          {problem}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-fg-muted">
        {resendIn > 0 ? (
          <p>
            {t.resendIn} <span className="font-mono tabular-nums">00:{String(resendIn).padStart(2, "0")}</span>
          </p>
        ) : (
          <button type="button" onClick={resend} className="min-h-11 text-accent">
            {t.resend}
          </button>
        )}
        <button type="button" onClick={onBack} className="min-h-11 text-accent">
          {t.wrongNumber}
        </button>
      </div>
      <Button type="submit" disabled={busy} className="w-full tablet:w-auto tablet:self-start">
        {busy ? t.verifying : t.verify}
      </Button>

      {devPanel && toast && challenge.demoCode && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-start justify-between gap-3 rounded-sm border border-dashed border-accent bg-surface-raised p-4 shadow-lg"
        >
          <p>
            <span className="label-caps block text-small text-accent">{t.demoToast}</span>
            {t.demoCode(challenge.demoCode)}
          </p>
          <button type="button" onClick={() => setToast(false)} className="min-h-11 shrink-0 text-small text-fg-muted">
            {t.dismiss}
          </button>
        </div>
      )}
    </form>
  );
}

const clock = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(
    new Date(iso),
  );

/* Step 3: the card */

function CardStep({
  session,
  card,
  outletNames,
  onCard,
  onLeave,
}: {
  readonly session: string;
  readonly card: Card;
  readonly outletNames: Readonly<Record<OutletSlug, string>>;
  readonly onCard: (card: Card) => void;
  readonly onLeave: (notice?: string) => void;
}) {
  const [qrOpen, setQrOpen] = useState(false);
  const [asking, setAsking] = useState(false);
  const [news, setNews] = useState("");
  const shown = useRef(card);

  /* The barista stamps on another device: check for changes while the card is open. */
  const refresh = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    const result = await service.getCard(session).catch(() => null);
    if (!result) return;
    if (!result.ok) {
      onLeave();
      return;
    }
    const before = shown.current;
    const after = result.value;
    if (after.history.length === before.history.length) return;
    shown.current = after;
    if (after.stamps > before.stamps) {
      setNews(t.landed(after.stamps, after.threshold));
      if ("vibrate" in navigator) navigator.vibrate(40);
    } else if (after.rewardsRedeemed > before.rewardsRedeemed) setNews(t.redeemedNow);
    onCard(after);
  }, [session, onCard, onLeave]);

  useEffect(() => {
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return (
    <div className="flex flex-col gap-6">
      <p className="-mt-4 text-h3 font-semibold text-accent">{t.count(card.stamps, card.threshold)}</p>
      <StampGrid stamps={card.stamps} threshold={card.threshold} label={t.cardLabel(card.stamps, card.threshold)} />
      <p role="status" className={news ? "text-success" : "sr-only"}>
        {news}
      </p>

      {card.rewardReady ? (
        <div className="flex flex-col gap-1 rounded-sm border border-accent bg-accent/10 p-4">
          <p className="text-h3 font-semibold">{t.readyTitle}</p>
          <p className="text-fg-muted">{t.readyBody}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 rounded-sm border border-accent p-4">
          <p className="font-semibold">{t.rewardAt(card.threshold)}</p>
          <p className="text-fg-muted">
            <Tbc id={placeholders.stampReward.id}>{placeholders.stampReward.value}</Tbc>
          </p>
        </div>
      )}

      <Button onClick={() => setQrOpen((v) => !v)} aria-expanded={qrOpen} className="w-full">
        {qrOpen ? t.hideQr : t.showQr}
      </Button>
      {qrOpen && <RotatingQr session={session} onSignedOut={() => onLeave()} />}

      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <h2 id="history-title" className="text-h3 font-semibold text-accent">
          {t.history}
        </h2>
        {card.history.length === 0 ? (
          <p className="text-fg-muted">{t.historyEmpty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line border-y border-line">
            {card.history.map((h, i) => (
              <li key={`${h.at}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-4 py-3">
                <span>
                  {t.reasons[h.reason]}
                  <span className="text-fg-muted">, {outletNames[h.outlet]}</span>
                </span>
                <span className="font-mono text-small text-fg-muted">{day(h.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={async () => {
              await service.signOut(session).catch(() => null);
              onLeave();
            }}
          >
            {t.signOut}
          </Button>
          <Button variant="quiet" onClick={() => setAsking(true)} aria-expanded={asking}>
            {t.delete}
          </Button>
        </div>
        {asking && (
          <div
            role="alertdialog"
            aria-labelledby="delete-ask"
            className="flex flex-col gap-4 rounded-sm border border-danger p-4"
          >
            <p id="delete-ask">{t.deleteAsk}</p>
            <div className="flex flex-wrap gap-3">
              <Button
                autoFocus
                onClick={async () => {
                  const result = await service.deleteCard(session).catch(() => null);
                  if (result?.ok) onLeave(t.deleted);
                }}
              >
                {t.deleteYes}
              </Button>
              <Button variant="secondary" onClick={() => setAsking(false)}>
                {t.deleteNo}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const day = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));

/** The barista's QR, renewed as each one runs out (60 seconds). */
function RotatingQr({ session, onSignedOut }: { readonly session: string; readonly onSignedOut: () => void }) {
  const [qr, setQr] = useState<StampQr | null>(null);
  const now = useNow(1000);
  const left = qr && now ? Math.max(0, Math.ceil((Date.parse(qr.expiresAt) - now.getTime()) / 1000)) : null;
  const stale = qr === null || left === 0;

  useEffect(() => {
    if (!stale) return;
    let live = true;
    service
      .getQr(session)
      .then((r) => {
        if (!live) return;
        if (r.ok) setQr(r.value);
        else onSignedOut();
      })
      .catch(() => null);
    return () => {
      live = false;
    };
  }, [stale, session, onSignedOut]);

  return (
    <div className="flex flex-col items-center gap-3">
      {qr ? (
        <TicketQr value={qr.token} label={t.qrLabel} />
      ) : (
        <div className="aspect-square w-full max-w-64 rounded-sm bg-surface-raised" aria-hidden="true" />
      )}
      <p className="font-mono text-accent tabular-nums" aria-hidden="true">
        {left !== null ? t.qrNewIn(left) : " "}
      </p>
      <p className="max-w-64 text-center text-small text-fg-muted">{t.qrNote}</p>
    </div>
  );
}
