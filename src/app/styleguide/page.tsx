import type { Metadata } from "next";
import { copy } from "@/content/copy";

export const metadata: Metadata = { title: copy.m0.styleguideTitle };

const swatches = [
  { name: "Carbon Black", token: "carbon-black", hex: "#121212", use: "Page" },
  { name: "Graphite", token: "graphite", hex: "#211F20", use: "Cards" },
  { name: "Pewter", token: "pewter", hex: "#393536", use: "Hairlines, raised" },
  { name: "Bone", token: "bone", hex: "#ECE7DF", use: "Text on dark" },
  { name: "Concrete", token: "concrete", hex: "#9A968F", use: "Secondary text" },
  { name: "Amber", token: "amber", hex: "#D98E3B", use: "Accent, focus" },
  { name: "Ember", token: "ember", hex: "#D9553F", use: "Errors, sold out" },
  { name: "Leaf", token: "leaf", hex: "#6FA37B", use: "Open, success" },
  { name: "Paper", token: "paper", hex: "#D2D2D2", use: "Menu page" },
  { name: "Ink", token: "ink", hex: "#373737", use: "Text on Paper" },
] as const;

const typeSteps = [
  { label: "Display", className: "text-display font-semibold", sample: "Brewed slowly." },
  { label: "Clock", className: "text-clock font-mono tabular-nums", sample: "96h" },
  { label: "H1", className: "text-h1 font-semibold", sample: "Cold brew" },
  { label: "H2", className: "text-h2 font-semibold", sample: "Three outlets" },
  { label: "H3", className: "text-h3 font-medium", sample: "C Scheme" },
  { label: "Label", className: "text-small label-caps", sample: "Signature cold brew" },
  { label: "Body", className: "text-body", sample: "Steeped 96 hours. Worth the wait." },
  { label: "Small", className: "text-small text-fg-muted", sample: "Placeholder text, clearly marked." },
  { label: "Mono", className: "text-body font-mono", sample: "CRB-4821 · Rs ---" },
] as const;

function ThemePanel({ theme }: { theme: "night" | "paper" }) {
  return (
    <section data-theme={theme} className="rounded-md border border-line bg-surface p-6 text-fg">
      <h2 className="label-caps mb-4 text-small">{theme === "night" ? "Night" : "Paper"}</h2>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          className="min-h-11 rounded-sm bg-accent px-5 font-medium text-on-accent active:scale-[0.98]"
        >
          Book a table
        </button>
        <a href="#content" className="text-accent underline underline-offset-4">
          See the menu
        </a>
        <span className="text-success">● Open now</span>
        <span className="text-danger">✕ Sold out</span>
      </div>
      <p className="mt-4 text-fg-muted">Secondary text sits here.</p>
    </section>
  );
}

export default function StyleguidePage() {
  return (
    <main id="content" className="content-cap flex flex-col gap-12 py-12">
      <h1 className="text-h1 font-semibold">{copy.m0.styleguideTitle}</h1>

      <section aria-labelledby="palette">
        <h2 id="palette" className="mb-6 text-h2 font-semibold">
          Palette
        </h2>
        <ul className="grid grid-cols-2 gap-4 tablet:grid-cols-3 laptop:grid-cols-5">
          {swatches.map((s) => (
            <li key={s.token} className="overflow-hidden rounded-md border border-line bg-surface-raised">
              <div className="h-20" style={{ backgroundColor: `var(--color-${s.token})` }} />
              <div className="p-3">
                <p className="font-medium">{s.name}</p>
                <p className="font-mono text-small text-fg-muted">{s.hex}</p>
                <p className="text-small text-fg-muted">{s.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="type">
        <h2 id="type" className="mb-6 text-h2 font-semibold">
          Type
        </h2>
        <dl className="flex flex-col divide-y divide-line border-y border-line">
          {typeSteps.map((t) => (
            <div key={t.label} className="flex flex-col gap-1 py-4 laptop:flex-row laptop:items-baseline laptop:gap-8">
              <dt className="w-24 shrink-0 font-mono text-small text-fg-muted">{t.label}</dt>
              <dd className={t.className}>{t.sample}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="themes" className="flex flex-col gap-6">
        <h2 id="themes" className="text-h2 font-semibold">
          Themes
        </h2>
        <div className="grid gap-6 laptop:grid-cols-2">
          <ThemePanel theme="night" />
          <ThemePanel theme="paper" />
        </div>
      </section>

      <section aria-labelledby="motif">
        <h2 id="motif" className="mb-6 text-h2 font-semibold">
          Grid motif
        </h2>
        <div className="grid-motif h-40 rounded-md border border-line" />
      </section>
    </main>
  );
}
