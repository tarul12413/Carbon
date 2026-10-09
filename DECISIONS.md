# Decisions

What was decided, why, and what else was considered. Newest at the bottom of each milestone.

## M0: Repo, tooling, tokens

### D-001 Next.js 16.3.8 with npm, exact pins

- **What:** Next.js 16.3.8 (App Router, Turbopack), React 19.2.8, TypeScript 5.9.3, npm with `save-exact`. Node 24 (`.nvmrc`), engines `>=22.12`.
- **Why:** The brief asks for current stable Next. I pin versions at least two weeks old to avoid fresh-release regressions. 16.3.6 met that rule but `npm audit` flagged six advisories (cache poisoning, image-optimiser SSRF and others) fixed in 16.3.8, published 9 days ago. A security fix outranks the age rule.
- **Alternatives:** 16.4.0 (3 days old, no security need). TypeScript 7.0 (native port): skipped until typescript-eslint and Next's type plugin are proven on it.

### D-002 Dependencies added in M0

| Package                                         | Why                                                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| tailwindcss, @tailwindcss/postcss 4.3.3         | Brief: Tailwind with CSS-variable tokens                                                                                   |
| eslint 9, eslint-config-next 16.3.8             | Next's flat config; Next 16 removed `next lint`                                                                            |
| prettier 3.9.9, prettier-plugin-tailwindcss     | Consistent formatting and class order; keeps diffs small                                                                   |
| vitest 5.0.2                                    | Brief: unit tests                                                                                                          |
| @playwright/test 1.63.0, playwright-core 1.63.0 | Brief: e2e. `playwright-core` is pinned explicitly so `@axe-core/playwright` does not pull a newer, type-incompatible copy |
| @axe-core/playwright 4.13.0                     | Brief: axe                                                                                                                 |

GSAP, Motion and zod are deferred to the milestone that first uses them, so nothing sits unused.

### D-003 Lighthouse CI via pinned npx, not a devDependency

- **What:** `npm run lhci` runs `npx @lhci/cli@0.15.1`.
- **Why:** As a devDependency it added 21 audit findings (puppeteer's tree) to the repo. Running it on demand keeps the lockfile clean while CI still enforces the budgets.
- **Known gap:** one high-severity dev-only finding remains (`braces`, via ESLint's glob tooling). No non-breaking fix exists; it never ships to the browser.

### D-004 Deploying the demo on Vercel with mock state (to settle in M3)

- **Problem:** The brief puts an in-memory store behind route handlers. On Vercel each request can hit a different serverless instance, so in-memory bookings would vanish or differ between pages.
- **Direction:** Keep the service interfaces and route-handler shapes from Blueprint section 9. For the hosted demo, the mock adapter keeps its state in the visitor's browser (localStorage), so one person can book as a customer and approve as admin in the same browser. Route handlers keep the in-memory store for local runs and tests. Phase 2 swaps both for Postgres.
- **Alternatives:** A hosted KV store (adds an account and secrets to a mock phase); one long-lived server (not Vercel).

### D-005 Tokens: raw palette plus semantic roles

- **What:** The ten brief colours are Tailwind theme tokens (`bg-amber`). Components use semantic roles (`bg-surface`, `text-fg`, `text-accent`) that switch with `data-theme="night" | "paper"`.
- **Why:** The menu page flips to Paper by changing one attribute, with no duplicated component styles.

### D-006 Paper theme needs darker accents (derived, not Carbon colours)

- **Finding:** On Paper (#D2D2D2), amber is 1.76:1, ember 2.61:1, leaf 1.93:1 and concrete 1.95:1. All fail AA, and an amber focus ring would fail the 3:1 non-text minimum.
- **What:** Each hue is darkened just enough to reach 4.5:1 on Paper: amber-deep #7C5122, ember-deep #9A3C2D, leaf-deep #43624A, concrete-deep #5E5A55. They are used only in the Paper theme.
- **Also found:** concrete on pewter is 4.11:1, so secondary text never sits on pewter. Pewter hairlines are 1.55:1 on black, so form-field borders use `line-strong` (concrete, 6.36:1). The blueprint's other ratios check out.
- **Guard:** `tests/unit/tokens.test.ts` reads `tokens.css` and fails if any of these pairs drift.

### D-007 Fonts through next/font/google, self-hosted at build

- **What:** Jost (variable) and IBM Plex Mono 400/500, exposed as CSS variables. Next generates size-matched fallbacks to prevent layout shift.
- **Why:** The brief's two families. No request goes to Google at runtime.

### D-008 Demo is not indexed

- **What:** `robots: noindex, nofollow` site-wide.
- **Why:** It is an unofficial concept for Carbon's own brand. It should not compete with or be mistaken for Carbon's listings before they say yes.

### D-009 CI on GitHub Actions

- **What:** typecheck, lint, format check, unit tests, build, Playwright (three viewports, axe), Lighthouse CI with the brief's budgets. Reports and screenshots uploaded as artifacts.
- **Note:** No remote exists yet; the workflow runs once the repo is pushed to GitHub. Locally, Playwright can use installed Edge (`PW_CHANNEL=msedge`) because Chromium could not be downloaded on this machine.

### D-010 Docs converted to Markdown, originals kept

- **What:** `docs/blueprint.md` and `docs/pitch-plan.md` were converted from the .docx files with a small script. Originals, zips and the concept HTML moved to `docs/originals/`; wireframe PNGs unpacked to `docs/wireframes/`.

### D-011 M0 baseline measurements

- **Lighthouse (local, Edge):** home LCP 2.56 to 2.69 s, TBT about 320 ms, against budgets of 2.5 s and 200 ms. This machine's Lighthouse benchmark index is 277 (a typical CI runner scores several times higher), so simulated 4x CPU throttling overstates the cost. GitHub Actions is the reference; local numbers are indicative only.
- **JavaScript:** the near-empty home route already ships 137 KB gzipped (Next.js + React runtime). That leaves about 33 KB of the 170 KB budget for M1. GSAP + ScrollTrigger alone is roughly that size, so the steep-clock scene must load after the headline and outside the initial bundle, and Motion stays off the home route.

## M1: Design system and home page

### D-012 Logo mark redrawn as SVG

- **What:** The four-glyph mark (leaf, circle, dot grid, waves) is an inline SVG in `CarbonMark.tsx`, measured from `docs/logo.png` (pixel bounding boxes, then a side-by-side render check). The wordmark is "CARBON" set in Jost.
- **Why:** The supplied PNGs are small rasters (447–500 px, mostly whitespace). An SVG stays sharp, takes the theme colour, costs no request, and lets the glyphs assemble one by one (header, 400 ms, skipped for reduced motion).
- **Alternatives:** Using the PNG (blurry at 2x, fixed colour); an automatic trace (needs a new tool, noisier paths). The `.avif` in docs/ was not used: opaque grey background and unclear source.

### D-013 Steep clock: sticky stage, GSAP scrub, CSS variable

- **What:** A tall track (320 svh on phones, 420 svh above 600 px) holds a `position: sticky` stage. GSAP ScrollTrigger scrubs a proxy from 0 to 1 (`scrub: 0.35`) and writes `--steep` on the stage. CSS reads it for the liquid level (`scaleY`), the darker brew layer and the amber wash (opacity). React re-renders only when the whole hour changes.
- **Why:** Native scroll, no scroll hijacking and no pin spacer, so layout stays stable. Only transform and opacity animate.
- **Modes:** One media query, `(prefers-reduced-motion: no-preference) and (min-height: 520px)`, chooses pinned or stacked. Stacked is also the server render and the no-JS view, so the content is always there.
- **Loading:** GSAP (45 KB gzipped) loads on the first scroll or when the section enters the viewport. Home first load is 140.7 KB gzipped (budget 170). An e2e test guards both numbers.
- **Accessibility:** The clock value is real text ("28 hours steeped"); the checkpoint line is announced through a polite live region; previous/next buttons step between checkpoints; inactive cards are `inert` while pinned.
- **Bug found and fixed:** Hours were floored, so pixel rounding landed on 27h for 28h and never reached 96h. Hours now round to the nearest whole hour; covered by unit and e2e tests.
- **Alternatives:** CSS scroll-driven animations (uneven support, and the brief names GSAP); ScrollTrigger `pin` (adds a spacer and reflow).

### D-014 Home content sources

- Cold brew names, notes and steep times are transcribed from menu page 3 into `data/menu.json` (partial transcription; the full menu is M2) and validated with zod at build time.
- "Signatures" shows the three drinks that carry Carbon's name (page 8), because the menu marks only cold brews as signature (Q-10). No prices anywhere on the home page; an e2e test checks the rendered text.
- Events teaser facts come from the pitch plan's PDF audit (Coffee Raves with a DJ, "Drip It Up" brewing workshops, the BMW Motorrad launch on 21 June 2025).
- The "Next event" line in Today at Carbon waits for event data in M4 (Q-13).

### D-015 Open-now status computed in the browser

- **What:** `OutletStatus` uses `useSyncExternalStore` with a 30-second clock. The static HTML shows plain hours; the browser swaps in "Open now, till 11:45 PM" or "Closed. Opens 9 AM" in Asia/Kolkata time.
- **Why:** The page is static, so a server-computed status would freeze at build time. Status uses a dot shape plus text, never colour alone.

### D-016 Placeholders are visible

- **What:** Unconfirmed values render through `<Tbc>` with a dotted underline and a small "TBC" tag, controlled by `NEXT_PUBLIC_FLAG_SHOW_PLACEHOLDERS` (on by default).
- **Why:** In a pitch, a founder should never mistake an assumed address or hour for a fact. Turn it off for screenshots once values are confirmed.

### D-017 Honest framing

- The footer says "A concept demo. Not Carbon's official website." Together with `noindex` (D-008), this keeps the demo from being mistaken for Carbon's own site.

### D-018 Test servers on their own ports

- **What:** Playwright starts `next start` on 3100 and Lighthouse on 3101.
- **Why:** A dev server was already running on 3000; reusing it measured unminified dev bundles (777 KB) and hid a real overflow bug.

### D-019 M1 measurements and open risks

- Lighthouse (local, benchmark index about 1,450): performance 96–98, accessibility 100, CLS 0, TBT 110–170 ms, home LCP 2.5 s. LCP passes with no margin: FCP is 0.9 s and the rest is simulated render delay. To revisit in M8 (font subset, hydration cost).
- The compact-phone sticky "Book" bar from the responsive plan is deferred to M3, when the booking flow exists to link into.
- Menu pages were rendered for transcription with pdf.js in a scratch folder (no project dependency).

## M2: Menu, outlets, cold brew, story

### D-020 Full menu transcription

- **What:** 166 items in 27 sections from the 12 menu pages of the March 2026 PDF, rendered to images (pdf.js in a scratch folder) and transcribed line by line into `data/menu.json`. Validated with zod at build time; unit tests pin the counts, the seven steep times and the price formats.
- **Model:** prices in paise, with an optional Hot/Cold label per price; `priceNote` for "MRP"; section `kind` (drinks, food, add-ons), printed `group` ("Between the Breads") and `note` ("*Upgrade beans @50.00").
- **No invented claims:** the only tags are `cold-brew` and `house-named`. I first tagged mocktails and the "No Caffeine Zone" as caffeine-free, then removed it: that section includes green tea (Q-14). Dietary tags wait for Carbon (brief: confirm before stating vegetarian or alcohol-free).
- **Corrections:** three spelling slips fixed, listed in OPEN_QUESTIONS.

### D-021 Signatures

- Signatures are the seven cold brews plus the four drinks that carry the Carbon name (Q-10 answer). A unit test checks that every item with "Carbon" in its name is tagged, so a new one cannot be missed.
- The periodic view shows these 11 only, with symbols derived from the menu name (`elementSymbols`, unique by construction). The list view is always one tap away.

### D-022 /menu

- Paper theme on the page's `main` only, so the Night header and footer frame it like a printed menu on a dark table.
- Server renders the full list (works without JS, deep links like `/menu#whiskey-barrel` land on the item). The client adds search (every word must match name, notes or section; accent-insensitive), filters, a sticky toolbar, a live result count, empty-state suggestions and a View Transition between List and Periodic.
- The item sheet is a native `<dialog>` (focus trap, Escape and backdrop close for free), styled as a bottom sheet on phones.
- PDF: the full 24-page file is served as-is (Q-06), with its edition, page count and size. `data/menu-document.json` stands in for the admin upload in M7. The record holds the date it was added to the site, not an invented print date.
- Table QR: `/menu?src=qr&outlet=<slug>` shows "Scanned at <outlet>" and nothing else. No ordering.

### D-023 Outlets behind a service

- Outlets moved from config into `data/outlets.json` behind `services.outlets`, like the menu, so Phase 2 can swap the source. Unconfirmed addresses reference their placeholder (P-09, P-10) instead of holding text.
- `/outlets/[slug]` is statically generated for the three slugs; anything else is a 404. Google Maps directions and `CafeOrCoffeeShop` structured data appear only for confirmed addresses, and the structured data leaves out the placeholder hours.

### D-024 /cold-brew and /story

- /cold-brew quotes Carbon's own cold brew paragraph from menu page 3 (attributed), then a steep explorer: a native range input (0 to 96, keyboard and screen reader friendly) plus checkpoint buttons, driving the same hand-drawn glass as the home clock. No process claims beyond the menu's own words.
- /story uses only Carbon's material: the cover line, the BMW Motorrad launch, the awards, the Carbon 2.0 Tilak Nagar build (page 16), and the three press pieces by publication, headline and date (page 21). No article text, links marked P-20.

### D-025 M2 measurements

- E2E: 86 tests pass at 360, 744 and 1440 px (axe clean and no horizontal overflow on every new page). Home JS stays at 140.7 KB gzipped.
- Lighthouse, simulated throttling (the CI gate): every page passes. LCP 2.25 to 2.47 s, CLS 0, accessibility 100. `/menu` first failed at 2.6 s; the IBM Plex Mono preload was competing with Jost and CSS for the first paint and is now off (mono text is never the first paint).
- **Known gap:** with real devtools throttling on this machine, LCP lands at 2.7 to 3.3 s (noisy, three runs per page). The trace shows the async hydration scripts finishing before first paint. For M8: measure on the CI runner, try inlining critical CSS, and trim the client components present on every page.
