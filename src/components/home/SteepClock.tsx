"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { STEEP_TO_END_EVENT } from "@/components/layout/SteepEasterEgg";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import {
  MAX_STEEP_HOURS,
  activeCheckpoint,
  checkpointsOf,
  clockDigits,
  hourFromProgress,
  joinNames,
  nextCheckpoint,
  previousCheckpoint,
  scrollTargetForHour,
  strikeTilt,
} from "@/domain/steep";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { cx } from "@/lib/cx";
import { BrewCard, type Brew } from "./BrewCard";
import { SteepGlass3D } from "@/components/three/SteepGlass3D";
import styles from "./SteepClock.module.css";

const t = copy.home.clock;

/** Pin only when motion is welcome and the screen is tall enough; otherwise stacked cards. */
const PIN_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 520px)";
const TYPE_MS = 32;

interface SteepClockProps {
  readonly brews: readonly Brew[];
}

export function SteepClock({ brews }: SteepClockProps) {
  const pinned = useMediaQuery(PIN_QUERY);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [hour, setHour] = useState(0);
  const [inView, setInView] = useState(false);

  const checkpoints = useMemo(() => checkpointsOf(brews.map((b) => b.steepHours)), [brews]);
  const groups = useMemo(
    () => checkpoints.map((cp) => ({ hour: cp, brews: brews.filter((b) => b.steepHours === cp) })),
    [brews, checkpoints],
  );
  const active = activeCheckpoint(hour, checkpoints);
  const activeGroup = groups.find((g) => g.hour === active);
  const line = activeGroup ? t.typedLine(activeGroup.hour, joinNames(activeGroup.brews.map((b) => b.name))) : "";

  /*
   * Scroll-driven progress. GSAP stays out of the first load: it is fetched on the
   * first scroll, or when the section enters the viewport (deep links, keyboard jumps).
   */
  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    if (!pinned || !track || !stage) return;

    let cleanup: (() => void) | undefined;
    let started = false;
    let cancelled = false;
    let lastHour = -1;
    const apply = (progress: number) => {
      stage.style.setProperty("--steep", progress.toFixed(4));
      const next = hourFromProgress(progress);
      if (next !== lastHour) {
        lastHour = next;
        setHour(next);
      }
    };

    const start = async () => {
      if (started) return;
      started = true;
      window.removeEventListener("scroll", start);
      loader.disconnect();
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const proxy = { p: 0 };
      const tween = gsap.to(proxy, {
        p: 1,
        ease: "none",
        onUpdate: () => apply(proxy.p),
        scrollTrigger: { trigger: track, start: "top top", end: "bottom bottom", scrub: 0.35 },
      });
      cleanup = () => {
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    };

    const loader = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void start();
    });
    loader.observe(track);
    window.addEventListener("scroll", start, { passive: true });

    const visibility = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)));
    visibility.observe(track);

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", start);
      loader.disconnect();
      visibility.disconnect();
      cleanup?.();
    };
  }, [pinned]);

  /* Typewriter line, retyped whenever a new checkpoint is reached. */
  const [typed, setTyped] = useState({ line: "", chars: 0 });
  useEffect(() => {
    if (!line) return;
    const id = window.setInterval(() => {
      setTyped((prev) => {
        const chars = prev.line === line ? prev.chars + 1 : 1;
        if (chars >= line.length) window.clearInterval(id);
        return { line, chars: Math.min(chars, line.length) };
      });
    }, TYPE_MS);
    return () => window.clearInterval(id);
  }, [line]);
  const shown = typed.line === line ? line.slice(0, typed.chars) : "";

  const goToHour = useCallback((target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const top = window.scrollY + track.getBoundingClientRect().top;
    const distance = track.offsetHeight - window.innerHeight;
    window.scrollTo({ top: scrollTargetForHour(target, top, distance), behavior: "smooth" });
  }, []);

  /* "96" easter egg and /#steep-96 links run the clock to the end. */
  useEffect(() => {
    const toEnd = () => {
      if (pinned) goToHour(MAX_STEEP_HOURS);
      else document.getElementById("steep-96")?.scrollIntoView({ block: "start" });
    };
    window.addEventListener(STEEP_TO_END_EVENT, toEnd);
    if (window.location.hash === "#steep-96") toEnd();
    return () => window.removeEventListener(STEEP_TO_END_EVENT, toEnd);
  }, [pinned, goToHour]);

  const prev = previousCheckpoint(hour, checkpoints);
  const next = nextCheckpoint(hour, checkpoints);
  const [tens, ones] = clockDigits(hour);

  return (
    <section
      id="steep-clock"
      aria-labelledby="steep-title"
      className={styles.section}
      data-mode={pinned ? "pinned" : "stacked"}
    >
      <div ref={trackRef} className={styles.track}>
        <div ref={stageRef} className={styles.stage} data-in-view={inView || undefined}>
          <div className={styles.amber} aria-hidden="true" />
          <div className={cx("content-cap", styles.layout)}>
            <header className={styles.head}>
              <p className="label-caps text-small text-fg-muted">{t.eyebrow}</p>
              <h2 id="steep-title" className={cx("text-h2 font-semibold text-balance", styles.title)}>
                {t.title}
              </h2>
              <p className={cx("text-fg-muted", styles.intro)}>{t.intro}</p>
            </header>

            {pinned && (
              <>
                <div className={styles.clock}>
                  <p className={styles.face}>
                    <span className="sr-only">{t.clockLabel(hour)}</span>
                    <span aria-hidden="true" className={styles.digits}>
                      {[tens, ones].map((digit, position) => (
                        <span
                          key={`${position}-${digit}`}
                          className={styles.digit}
                          style={{ "--tilt": `${strikeTilt(digit, position, hour)}deg` } as CSSProperties}
                        >
                          {digit}
                        </span>
                      ))}
                      <span className={styles.unit}>h</span>
                    </span>
                  </p>
                  <p className={styles.typed} aria-hidden="true">
                    {active === null ? t.waiting : shown}
                    <span className={styles.caret} />
                  </p>
                  <p className="sr-only" aria-live="polite">
                    {line}
                  </p>
                </div>

                <div className={styles.glassCell}>
                  <SteepGlass3D />
                </div>
                <ol className={styles.timeline} aria-hidden="true">
                  {checkpoints.map((cp) => (
                    <li
                      key={cp}
                      className={styles.tick}
                      data-reached={cp <= hour || undefined}
                      data-active={cp === active || undefined}
                      style={{ "--at": cp / MAX_STEEP_HOURS } as CSSProperties}
                    >
                      {cp}h
                    </li>
                  ))}
                </ol>

                <div className={styles.controls}>
                  <p className="text-small text-fg-muted">{t.hint}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={styles.step}
                      onClick={() => prev !== null && goToHour(prev)}
                      disabled={prev === null}
                    >
                      <Icon name="chevronUp" label={t.prev} />
                    </button>
                    <button
                      type="button"
                      className={styles.step}
                      onClick={() => next !== null && goToHour(next)}
                      disabled={next === null}
                    >
                      <Icon name="chevronDown" label={t.next} />
                    </button>
                  </div>
                </div>
              </>
            )}

            <ol className={styles.groups}>
              {groups.map((group) => {
                const isActive = group.hour === active;
                return (
                  <li
                    key={group.hour}
                    id={`steep-${group.hour}`}
                    tabIndex={-1}
                    className={styles.group}
                    data-active={isActive || undefined}
                    inert={pinned && !isActive}
                  >
                    <p className={styles.groupHour}>
                      <span className="sr-only">{t.steeped(group.hour)}</span>
                      <span aria-hidden="true">{group.hour}h</span>
                    </p>
                    <div className={styles.cards}>
                      {group.brews.map((brew) => (
                        <BrewCard key={brew.id} brew={brew} />
                      ))}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
