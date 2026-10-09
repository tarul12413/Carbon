import Link from "next/link";
import { OutletStatus } from "@/components/outlets/OutletStatus";
import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { copy } from "@/content/copy";
import { routes } from "@/config/routes";
import { site } from "@/config/site";
import { services } from "@/services";
import styles from "./Hero.module.css";

const t = copy.home.hero;

function DropArt() {
  return (
    <svg viewBox="0 0 240 240" className={styles.art} aria-hidden="true">
      <line x1="120" y1="0" x2="120" y2="34" className={styles.thread} />
      <circle cx="120" cy="40" r="6" className={styles.hanging} />
      <circle cx="120" cy="40" r="6" className={styles.falling} />
      <circle cx="120" cy="150" r="84" className={styles.ring} style={{ animationDelay: "1.05s" }} />
      <circle cx="120" cy="150" r="60" className={styles.ring} style={{ animationDelay: "0.9s" }} />
      <circle cx="120" cy="150" r="36" className={styles.ring} style={{ animationDelay: "0.75s" }} />
      <circle cx="120" cy="150" r="14" className={`${styles.ring} ${styles.core}`} style={{ animationDelay: "0.6s" }} />
    </svg>
  );
}

export async function Hero() {
  const [flagship] = await services.outlets.listOutlets();
  return (
    <section aria-labelledby="hero-title" className={styles.hero}>
      <div className={`content-cap ${styles.grid}`}>
        <div className={styles.artCell}>
          <DropArt />
        </div>
        <div className={styles.copy}>
          <h1 id="hero-title" className="text-display font-semibold tracking-tight">
            {t.lead} <span className="block text-accent">{t.accent}</span>
          </h1>
          <p className="text-h3 font-normal text-fg-muted">{t.sub}</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={routes.book}>{t.book}</ButtonLink>
            <ButtonLink href={routes.menu} variant="secondary">
              {t.menu}
            </ButtonLink>
          </div>
        </div>
        <div className={styles.bar}>
          <span className="font-mono text-h3 font-medium text-accent" aria-hidden="true">
            00h
          </span>
          <Link
            href="#steep-clock"
            className="inline-flex min-h-11 items-center gap-2 text-fg-muted hover-fine:text-fg"
          >
            {t.scrollHint}
            <Icon name="arrowDown" className="size-4" />
          </Link>
          {flagship && (
            <span className="hidden text-small laptop:inline-flex laptop:items-center laptop:gap-1">
              <span className="text-fg-muted">{flagship.name}:</span>
              <OutletStatus hours={flagship.hours} timeZone={site.timeZone} />
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
