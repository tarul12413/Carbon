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

### D-004 Deploying the demo on Vercel with mock state (settled in M3, see D-026)

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
- **Changed in M8 (D-061):** Plex Mono ships 400 only.

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
- The compact-phone sticky "Book" bar from the responsive plan is deferred to M3, when the booking flow exists to link into (done in M3, D-031).
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

## M3: Booking

### D-026 Where mock bookings live (settles D-004)

- **What:** One mock engine (`src/services/mock/bookingEngine.ts`) holds every booking rule as pure functions over a plain database object. Two stores feed it: the visitor's localStorage for the hosted demo (`browserStore`), and process memory behind the route handlers (`serverBookings`) for local runs and tests. `NEXT_PUBLIC_BOOKING_TRANSPORT=http` makes the UI talk to the route handlers instead.
- **Why:** On Vercel, serverless instances do not share memory, so a booking made on one request could vanish on the next. In the browser it survives reloads and works for one person playing customer and, in M7, admin. The same engine behind both means the rules are tested once.
- **Endpoints:** `GET /api/availability`, `POST /api/bookings`, `GET /api/bookings/:code`, `POST /api/bookings/:code/{confirm,request,change,cancel}` (Blueprint section 9). Bodies are `{ ok, value }` or `{ ok: false, error }` with a matching HTTP status. Writes need an `Idempotency-Key` header.
- **Atomic holds:** each call runs synchronously from load to save, so two holds cannot both take the last seats. Phase 2 gets the same from a database transaction that locks the slot.
- **Weight:** the engine and zod load only when the flow first calls the service (dynamic import in `src/services/client.ts`). Home JS: 160.5 KB gzipped, including the prefetch of `/book`; it was 254 KB before this split.
- **Alternatives:** a hosted KV store (accounts and secrets in a mock phase); shipping the engine in the page bundle (96 KB gzipped more, prefetched from every page with a Book link).

### D-027 Booking rules

- Availability is capacity minus the party sizes of confirmed bookings and live instant holds whose 90-minute table time overlaps the slot (Blueprint section 9). Large-group requests do not take seats until approved (Q-17).
- Slots are on a 30-minute grid; a slot is offered only if its whole table time fits before closing (Q-16), and same-day slots start at least 60 minutes from now (P-15). "Filling up" means fewer seats would be left after this party than one more small group needs.
- Instant up to 6 (P-01), request above, up to 20 on the form (P-21); bigger parties are pointed to the enquiry form.
- Holds last 10 minutes (P-02). Expiry is checked on every read and write, so an expired hold frees its seats at once without a background job.
- Duplicates: same phone, same slot and same party within five minutes returns the existing booking. Party size is part of the match, because a different party is a different booking.
- Change or cancel only for confirmed bookings, up to the window (P-05: "X hours" shown, 2 hours in the demo's logic). A change moves the booking in one step and does not count its own seats.
- Going back in the flow and changing outlet, time or party releases the old hold (cancel on a held booking marks it expired; the state machine has no held-to-cancelled step).
- Fully covered by unit tests: availability, instant versus request, hold expiry at the exact instant, idempotency, the state machine, the race for the last seats, and the route handlers.

### D-028 Idempotency and double submits

- Successful writes are remembered for 24 hours under their key with a fingerprint of the request. The same key and request replays the first answer; the same key with a different request is refused. Failures are not remembered, so a retry can succeed.
- The client derives one key per distinct request (`useIdempotencyKey`), disables the button and keeps an in-flight guard. A double tap on Review or Confirm makes one booking (e2e test).

### D-029 The flow

- Six steps as in the brief (Q-03): outlet, date and time, party size, details, review and pay choice, confirmation. Large groups get the request form at step five; step six is the booking's own page, `/book/CRB-1234`, which is also the manage page.
- The step lives in the URL (`?step=`), so the browser back button works; the draft lives in sessionStorage, so a reload keeps it. The step heading takes focus on each change.
- The details form is validated by the service, not twice: the form shows the field errors it gets back, with a summary at the top. A hidden honeypot field is the "invisible bot check"; a real one comes with the Phase 2 backend.
- Pay online is shown but disabled, labelled "Checkout arrives in the next build", with the deposit as "Rs ---" (P-04). M4 wires it to the sample payment sheet.
- The hold countdown is a `role="timer"`; screen readers hear it at 5 minutes and 1 minute, not every second. When it runs out the page says so and offers to check the time again with the details kept.
- The booking page masks the phone number (anyone with the code can open it), offers a calendar file, a WhatsApp message preview (labelled as a sample; nothing is sent), directions for confirmed addresses only, and change or cancel.
- `/book` server-renders step one inside the same layout component as the flow, so the swap to the live flow does not shift the page (CLS 0).

### D-030 Demo controls

- With the `devPanel` flag on, booking pages end with a "Demo controls" disclosure: expire holds now, and reset demo bookings to the seed. The seed is fictional (Q-08) and dated relative to today, so tomorrow evening at C Scheme is always busy enough to show full and filling-up slots.

### D-031 Phone Book bar

- Below 600 px every page except the booking flow has a fixed "Book a table" bar (Blueprint section 6: primary action in the thumb zone). Its height is a CSS variable, `--sticky-bar`, which the pinned steep clock adds to its bottom padding so its controls stay clear.

### D-032 M3 measurements

- Unit: 108 tests. E2E: 117 pass at 360, 744 and 1440 px (axe clean on every booking screen), 3 skipped by design.
- Lighthouse, simulated: accessibility 100 and CLS 0 on all six URLs (now including `/book`). LCP medians of three runs: home 2.47 s, `/cold-brew` 2.57 s, `/outlets/c-scheme` 2.39 s, `/story` 2.39 s, `/menu` 2.61 s, `/book` 2.62 s. The CI assertion takes the best run, and fails on `/menu` (2.59 s) and `/book` (2.61 s).
- **Known gap, unchanged from D-025:** LCP sits right at the 2.5 s line and moves with machine load. The M2 build, measured again on the same machine the same night, gave `/menu` 2.47 to 2.73 s, so this is not an M3 regression. It is the M8 performance item.

## M4: Events, checkout, tickets

### D-033 Dependencies: uqr and @noble/hashes

- **uqr 0.1.3** (April 2026, no dependencies) encodes ticket QRs; the page draws the SVG itself in brand colours with a proper quiet zone. Alternatives: `qrcode` (bigger, canvas-oriented), `qrcode-generator` (older API).
- **@noble/hashes 2.4.0** (August 2026) signs ticket tokens and the sample gateway's payment signatures with HMAC-SHA256. It works outside secure contexts, unlike Web Crypto, so a phone on the LAN over http still works. Alternative: Web Crypto `subtle` (async, https only).
- The signing keys are labelled public placeholders (`*-not-a-secret`). The brief forbids real keys; Phase 2 signs on the server with secrets from the environment.

### D-034 One mock database for everything

- Bookings, orders, tickets, the waitlist and handled webhook ids live in one object (`src/services/mock/db.ts`, version 2, localStorage key `carbon-demo:db:v2`). A deposit payment can then confirm its table booking in the same step, and cancelling that booking refunds the deposit.
- `createMockBackend` exposes `bookings`, `ticketing`, `gateway` (the sample payment sheet and bank), `demo` and `webhooks`. Route handlers mirror the planned API: `/api/events/:slug/availability`, `/api/events/:slug/waitlist`, `/api/waitlist/:id`, `/api/orders`, `/api/orders/:id`, `/api/orders/:id/checkout`, `/api/orders/:id/verify`, `/api/tickets/:code`, `/api/tickets/:code/cancel`, `/api/webhooks/payments`, plus `/api/demo-gateway/{pay,settle}` for the demo only.
- The browser loads the engines only after the page has loaded and gone idle, so they never compete with the first paint (`/events` LCP went from 3.6 s to 2.3 s).

### D-035 Order state machine and the payment flow

- States: held, awaiting_payment, reserved (pay at the cafe), paid, expired, cancelled, refunded (`src/domain/orders/machine.ts`). A failed attempt is not a state: the order stays held and the customer can try again, use another method, or pay at the cafe.
- Payment follows the blueprint's Razorpay pattern without Razorpay. The server sets the amount and ignores any price in the request. The client gets a gateway order id, the sample sheet returns a payment id and signature, and `verify` checks the signature without finishing anything. The webhook is the source of truth: it is signed, each event id is handled once, and the order's state decides what an event can still do.
- Edge cases from Blueprint 11, all unit-tested: double tap on Pay (idempotency key, one order per hold); money arriving after the hold ran out (seats taken back if still free, otherwise an automatic refund); the same webhook delivered twice (one ticket); pending then declined (back to held).
- Amounts are unknown (P-03, P-04), so they are `null` and always shown as "Rs ---". Nothing is computed from an invented price.

### D-036 Sample payment sheet

- A clearly labelled "Sample payment sheet: not a real gateway, no money moves", light on the dark site, with generic UPI, cards, netbanking and wallets and no gateway branding (brief). Nothing typed into it is stored or sent.
- With the dev panel flag on, the sheet has a "Demo outcome" choice: success, failed, pending. On the pending screen, demo controls play the bank: approve, approve with the webhook sent twice, or decline.

### D-037 Events, stock and tickets

- Sample events (Q-07) live in `data/events.json`: Coffee Rave, Drip It Up and Kitchen Rave (names from Carbon's own events), dated days from today, all labelled "Sample". Past: the BMW Motorrad launch (Q-12). The list and detail pages render per request so the dates stay current; home rebuilds hourly for "Next up" (Q-13).
- Seats left = quota minus sample sales, live holds, pending payments, pay-at-cafe reservations, paid orders and seats offered to the waitlist, checked and taken in one step. "Few left" at a fifth of the quota or less (a display rule, not a Carbon policy). Up to 6 per order (P-24).
- Pay at the cafe reserves seats and issues an unpaid ticket. Unpaid seats are released at a deadline before the start (P-22: "a time Carbon sets", 2 hours in the demo's logic).
- One ticket per order, admitting the whole party (wireframe: "Coffee Rave x 2"). Its QR holds a signed token (code, event, seats, issue time). The door scanner in M5 verifies it and marks it used once.
- Cancel and refund: inside the window (P-05), a paid ticket is refunded to the original method ("Rs ---", "timing depends on your bank") and a pay-at-cafe ticket is simply released. Freed seats go to the waitlist first.
- On phones the fixed "Book a table" bar is hidden on pages with their own primary action (booking, checkout, tickets, event detail).

### D-038 Waitlist

- Only for sold-out events. Phone, WhatsApp consent, privacy notice and a honeypot; the same phone joining again gets its existing place.
- When seats open, the first person whose party fits gets an offer with a claim window (P-23, 30 minutes); the seats are held for them, so nobody else can take them. If the window lapses, the next person is offered, and lapses that happened while nobody was looking are caught up in order, as a background job would. Messages are shown as samples; nothing is sent.
- The demo control "Someone cancels (open a seat)" releases one sample seat, to show the offer chain.

### D-039 Table deposit

- "Pay online" on the booking review is live: it creates a deposit order tied to the table hold and goes to the same checkout (online only; "Pay at the cafe instead" confirms the booking directly). Paying confirms the booking with "Deposit paid online". Cancelling it later refunds the deposit; a payment that lands after the table hold ran out is refunded automatically.
- Known rough edge for M8: a fast double tap on "Review" can land the second tap on the next screen's pay choice. The booking is still made once; the choice can be changed before confirming.

### D-040 Lighthouse gates

- The 170 KB script budget is the brief's home-route budget, so it is an error on `/` only and a warning elsewhere (`assertMatrix`). Booking and event pages carry the mock engine, about 100 KB gzipped of which is zod and the rules, loaded after the page is idle. Phase 2 moves that work to the server.
- `/events` and `/events/coffee-rave` are now in the Lighthouse run.

### D-041 M4 measurements

- Unit: 133 tests. E2E: 147 pass at 360, 744 and 1440 px, 3 skipped by design. Covered: events list and filters, buying a ticket with success, failed then retry, and pending with a repeated webhook; pay at the cafe; detail checks; hold expiry; cancel and refund; waitlist join, offer and claim; table deposit. Every new screen is axe-clean.
- Lighthouse, simulated: accessibility 100 everywhere. LCP medians: `/events` 2.30 s, `/events/coffee-rave` about 2.5 s, home 2.46 to 2.56 s. `/menu` (2.60 s) and `/book` (2.65 to 2.77 s) still miss 2.5 s: the gap from D-025 and D-032, for M8.
- Home JS (Playwright budget test): passes under 170 KB.

## M5: Stamp card and staff scanner

### D-042 The flag, and what it switches

- The stamp card stays behind `NEXT_PUBLIC_FLAG_STAMP_CARD`, off by default (locked decision). Off: `/my-carbon` is a 404, the stamp routes under `/api/auth`, `/api/me` and `/api/staff` (cards, stamps, redeem) answer 404, the footer has no "My Carbon" link, and `/staff` shows only the event door. On: all of it appears. Turn it on in Vercel's environment settings for the pitch and redeploy.
- CI builds with the flag on, so the stamp card's end-to-end tests run there. A build without it skips them; unit tests cover the "off" answers.
- Alternatives: a runtime switch in the dev panel (the brief asks for a feature flag, and a visitor toggle would blur "off by default"); two CI builds (twice the time for one 404).

### D-043 Sign-in with a code (mock OTP)

- Phone plus a six-digit code only (locked decision). Consent with the notice version (P-18) is required before a code is sent, and is recorded with the time. A hidden honeypot is the bot check.
- Rules from Blueprint section 9, numbers in P-25: a code lasts 5 minutes and allows 5 tries; 30 seconds between sends; 3 sends an hour per phone. Codes are stored as SHA-256 hashes with their challenge id, never as typed, and deleted after a day. Six boxes take typing, Backspace, arrows, paste and SMS autofill (`one-time-code`).
- No SMS is sent. The mock returns the code, and the page shows it in a toast labelled "Demo SMS", only with the dev panel flag on. Phase 2 sends it through a DLT-registered provider and the field disappears.
- The demo keeps the session id in this browser; the route handlers already set it as a secure, HTTP-only cookie (30 days, sliding), as Phase 2 will.
- Not built: the per-IP limit (the browser mock has no IP), and a WhatsApp fallback (Blueprint: later).

### D-044 The card, the QR and the ledger

- Stamps are an append-only ledger (Blueprint section 9: stamp_ledger); the balance is the sum. A visit adds 1, an undo adds -1 and points at the visit, a redeem takes off the threshold (P-06, 8).
- The card's QR is a signed token (HMAC, its own key, kind "stamp") that lasts 60 seconds (brief). The page asks for a fresh one as each runs out and shows the countdown, so a screenshot is useless a minute later. A stamp QR is never accepted as a ticket, and the other way round.
- The card checks for changes every 3 seconds while open, so a stamp added at the counter lands on the customer's phone with a small bounce and, where supported, a short vibration (Blueprint section 8).
- Self-service deletion removes the customer, their ledger, rewards, sessions and sign-in records, and anonymises the audit log entries (Blueprint section 12).
- Seed: two fictional cards (Q-08), +91 90000 00201 with 5 stamps and +91 90000 00202 with a full card, so the scanner has someone to look up.

### D-045 Staff scanner

- `/staff` signs in by picking a sample account (owner, a manager and a barista per outlet, marketing) and the outlet the device is at. Fictional, no names. Phase 2: magic link or Google sign-in on registered devices (Blueprint section 10). M7's admin will reuse these accounts.
- Who can do what, from Blueprint section 10: owners and baristas stamp and redeem; owners, managers and baristas check people in; marketing does neither. Everyone only at their own outlet, owners anywhere (Q-26).
- Camera: not in Phase 1 (brief: a mock scanner). "Simulate scan" reads the QR a signed-in My Carbon tab is showing, or the newest ticket not yet checked in, from this browser's demo data. Typing a phone number or a ticket code is the fallback the blueprint asks for when the camera is denied.
- Adding a stamp is optimistic and rolls back quietly if refused (Blueprint section 8). One stamp per idempotency key, and a minimum gap (P-17, 30 minutes) so a double scan cannot add two; the barista sees "Last stamp 2 h ago" and when the next is allowed. Undo works on the latest stamp for 2 minutes (P-26).
- A full card takes no more stamps until it is redeemed (Q-25). Redeeming needs the outlet PIN (P-28, mock "1896", shown under the form with the dev panel on). A wrong PIN is logged; the reward cannot be redeemed twice.
- Every stamp, undo, redemption, wrong PIN and check-in is written to an audit log with the staff account, outlet and time (Blueprint section 9: audit_log), ready for M7's admin.

### D-046 Event door

- Always on: tickets exist without the stamp card. Scan or type the code; the signature is checked first, so a forged QR is refused.
- A ticket checks in once (`checkedInAt`, `checkedInBy`); a second scan says when it was used. A pay-at-the-cafe ticket is collected first ("Collected the payment, check in" moves the order to paid). Cancelled, refunded and released tickets are refused. A checked-in ticket can no longer be cancelled online.
- A ticket for another day shows a warning but can still be checked in (Q-27), because the demo's events are always days away.
- Not built: the cached attendee list for weak signal (Blueprint section 11). Checking the signature needs no network, so Phase 2's offline door scanner can build on it.

### D-047 M5 measurements

- Unit: 157 tests (24 new: sign-in codes, the 60-second QR, gap, undo, full card, PIN redeem, roles, deletion, check-in once, pay at the door, and the routes with the flag on and off). E2E: 162 pass at 360, 744 and 1440 px with the flag on, 3 skipped by design; with the flag off the 12 stamp card tests skip and the door tests pass. Every new screen is axe-clean.
- Lighthouse on the default build (flag off), simulated: accessibility 100 and CLS 0 everywhere. LCP medians: `/story` 2.18 s, `/events` 2.34 s, `/outlets/c-scheme` 2.38 s, `/cold-brew` 2.47 s, `/events/coffee-rave` 2.49 s, home 2.58 to 2.63 s, `/menu` 2.65 s, `/book` 2.66 s.
- Home moved from 2.46–2.56 s (M4) to 2.58–2.60 s over five runs. The only M5 bytes on home are the new copy: `copy.ts` ships whole to every page that uses it (about 17 KB gzipped, of which M5 added about 2 KB). Separate exports in the same file were tried and not tree-shaken by Turbopack, so they were reverted. Splitting copy per page is an M8 item and needs a decision on the "one copy file" rule (Q-28).

## M6: Book wall, enquiries, legal, 404 and offline

### D-048 Book wall

- Spines are drawn from the title (Blueprint 5.6): a hash (FNV-1a) picks one of six muted cloth colours, the height and the thickness, so there are no cover images and the same book always looks the same. The colours are new tokens (`--color-spine-0` to `5`), each at least 6:1 against the bone title; they are not Carbon colours.
- Titles merge when they differ only in case, accents, punctuation, spacing or a leading "The", "A" or "An". A merged spine shows its reader count and every reader's line. Names show only when the reader ticked "Show my name on the wall".
- Adding a book: title, author, one line (80 characters, wireframe 10), optional first name or handle. Checks, in order: lengths, the bot check, the profanity filter, a repeat within five minutes (returns the first), and 3 an hour per device (P-29; per IP in Phase 2). Then it waits for staff.
- The mock bot check is a hidden honeypot field plus a time trap (a form sent within 3 seconds of the first keystroke is refused). Phase 2 uses an invisible bot check at the edge (Blueprint section 8).
- The profanity filter is deliberately short: clear abuse in English and Hinglish, with common letter swaps. Words that appear in real titles ("Moby Dick", "The Bastard of Istanbul") are left to staff, who approve everything anyway.
- "I read this too" adds a reader with no text, so it needs no approval; once per book per browser. "Report" records a flag for staff.
- Moderation is M7. Until then the demo panel's "Staff approve waiting books" stands in.
- Spines slide onto the shelf at a hash-chosen tilt, paused until the shelf is on screen (Blueprint section 7). CSS only: the blueprint names the Motion library, but this needs no dependency. Reduced motion skips it.
- Seed: 16 real titles with fictional readers and lines, under a visible "Sample shelf" note (Q-29).

### D-049 Enquiries

- `/enquire` takes the brief's four kinds: catering, collab or launch, workshop, other. `?type=` preselects one: the events teaser links to collab, and the booking flow sends groups over 20 to "Something else".
- Fields: name, phone, optional outlet, date and head count, details (10 to 600 characters), WhatsApp consent, privacy notice, honeypot. A repeat within five minutes returns the first. Each gets a reference (ENQ-1234) and waits in the mock inbox for M7.
- Nothing is sent anywhere. The reply time is a placeholder (P-30).

### D-050 Legal pages

- `/legal/privacy`, `/legal/terms`, `/legal/refunds`: short, plain-language, and each under a banner saying it is placeholder text for Carbon's lawyer (brief; Blueprint section 12).
- They describe what the site does (what each form collects, holds, how refunds flow) and state no rule Carbon has not set. Every unconfirmed value is written in the copy as `[[placeholderKey]]` and rendered from `placeholders.ts` with its TBC tag; a unit test checks every key exists. New: privacy contact (P-31), retention period (P-32), legal entity (P-33).
- Liability, disputes and governing law are left to the lawyer, in so many words.

### D-051 404

- `src/app/not-found.tsx`: one line of copy and links home, to the menu and to booking (Blueprint section 4).

### D-052 Offline

- A small hand-written service worker (`public/sw.js`, no dependency), registered in production builds after the page has loaded. Pages: network first, keeping a copy of each page opened (up to 40), so a ticket or booking opened once still opens with no signal; its data already lives in the browser. A page never opened shows `/offline`. Build assets under `/_next/static` are cache-first (their names change with every build). `/api` is never cached.
- The worker also keeps the offline page's own scripts and styles at install. Without them the page could not start offline (found by the end-to-end test).
- `/sw.js` is served with no-cache headers so a new deploy reaches everyone (Next's PWA guide). Next 16's experimental `useOffline` was considered: it covers only in-app navigation, not a reload at the door.
- Playwright blocks service workers except in the offline test, so cached pages cannot leak between tests.

### D-053 Smaller changes

- The phone "Book a table" bar matched paths by prefix, so `/book` also hid it on `/book-wall` by accident. It now matches whole path segments, and the wall and enquiry pages (which have their own main button) are listed on purpose.
- Form limits and enquiry types live in zod-free modules (`domain/wall/limits.ts`, `domain/enquiry/types.ts`), so the forms do not pull zod into their first JavaScript. `/enquire` went from 2.77 s to 2.32 s LCP.

### D-054 M6 measurements

- Unit: 172 tests (15 new: title merging, spine shapes, the word filter against real titles, approval, limits, bot checks, enquiries, routes, and legal placeholders). E2E: 192 pass at 360, 744 and 1440 px with the stamp card flag on, 3 skipped by design. New flows: add a book and see it approved, spine detail, bot and word checks, enquiry, the three legal pages, 404, and offline. Every new screen is axe-clean.
- One earlier full run had 3 timeouts in older booking and event tests under parallel load; they passed when rerun on their own and in the final full run. Worth watching in CI, which retries once.
- Lighthouse on the default build, simulated: accessibility 100 everywhere. LCP medians: `/outlets/c-scheme` 2.39 s, `/story` 2.32 s, `/enquire` 2.32 s, `/book-wall` 2.34 s, `/cold-brew` 2.42 s, home 2.45 s, `/events/coffee-rave` 2.47 s, `/events` 2.49 s, `/menu` 2.63 s, `/book` 2.78 s. `/menu` and `/book` still miss 2.5 s (M8).
- Home is back at 2.43 to 2.45 s, so M5's 2.58 to 2.63 s was mostly machine noise. The one-copy-file cost (Q-28, kept as is) still stands: M6 added the legal and wall text to it.
- `/book-wall` has a layout shift of 0.035 while the shelf loads from the browser (gate: 0.1). The loading placeholder can match the real height more closely in M8.

## M7: Admin with role switcher

### D-055 Back-office copy in its own file

- The admin's text pushed the home page to 176.3 KB of first-load JavaScript (budget 170 KB), because `copy.ts` ships whole to every page and Turbopack does not tree-shake separate exports of one module (D-047, Q-28).
- Tarul chose (2026-10-17): customer-facing copy stays in `src/content/copy.ts`; back-office copy (the admin and the staff scanner) moves to `src/content/admin-copy.ts` (`adminCopy`, `staffCopy`). CLAUDE.md says so. Home is back under budget, and customer pages lost the scanner's text too.
- Alternatives: keep one file and list the miss as a known gap, or cut about 7 KB elsewhere on home.

### D-056 Admin sign-in and roles

- `/admin` opens with a mock sign-in: pick one of the sample accounts (owner, a manager and a barista per outlet, marketing). The choice is kept in this browser (`carbon-demo:admin`) and can be switched or signed out at the top of every admin page. Phase 2: magic link or Google sign-in, multi-factor optional (Blueprint section 10).
- What each role sees and does follows Blueprint section 10 and lives in one table (`src/domain/admin/access.ts`): owner everything; manager their outlet's bookings, capacity and hours, menu availability, events, check-in and audit log; barista today's bookings and check-in; marketing events, wall moderation and enquiries. The engine checks every call (role, then outlet); the screens only hide what the engine would refuse.
- Every change is logged with the account, outlet, what changed and when (`audit_log`). The audit log moved out of the stamp card schema into `src/domain/audit.ts` and gained an optional outlet and a short "what changed" detail.
- Route handlers under `/api/admin/*` mirror the service, with the account in an `x-demo-staff` header (mock only, like the scanner's; Phase 2 reads the staff session).

### D-057 Bookings, capacity and hours

- Bookings: group requests, oldest date first, with the seats still free at that time and a warning when the group is bigger than that (Q-17: staff check capacity when approving). Approve, decline (asks once more), staff note. On the day: seated, and no-show once the time has passed. Baristas see today only. An approved request is pay-at-the-cafe; deposits stay an open question (Q-34).
- Capacity and hours per outlet: opening and closing time, seats per slot, and dates closed for bookings with a staff-only reason. Saved values sit on top of the placeholders (P-08, P-14), which stay open until Carbon confirms. Booking availability reads them at once; a closed date shows "Closed for bookings" in the slot picker and refuses holds.
- Bookings already made stay put when hours shrink or a date closes; the save says how many now fall outside so staff can call those guests. Moving or cancelling them automatically would be a policy Carbon has not set.
- Public pages keep showing the hours from `placeholders.ts`: in Phase 2 a publish revalidates them. The demo says so on the screen.
- Not built (Blueprint section 10, later): walk-ins, a calendar view, slot rules beyond seats per slot, special hours for one day, reports.

### D-058 Menu editor

- Owner edits name, notes, price per serving (in rupees), steep hours (cold brews only) and the two tags the site uses ("signature cold brew", "carries Carbon's name"). Edits wait as drafts and go live together on "Publish" (Blueprint 11: prices change only on publish). A draft that matches what is live is dropped. The printed shape is kept: one price per printed serving, no prices where the menu prints a note.
- Dietary tags are not offered: the brief asks to confirm veg and alcohol facts before stating them.
- The sold-out switch is per outlet and live at once, for owners and that outlet's manager. `/menu` greys the item ("Not today") at the outlet from a table QR (`?outlet=`), and everywhere only when it is off at all three.
- Mock PDF upload: the browser reads the file's name, size and first bytes; the service checks it is a PDF ("%PDF-") under 10 MB (a technical cap, not a Carbon rule) and records it. The file is not kept and the download stays the shipped PDF; the screen says so. A warning lists items published after the last upload (Blueprint 11).
- Demo only: `/menu` reads published edits from this browser's saved data with a small zod-free hook, so a publish shows there straight away. Other pages (home signatures, cold brew) keep the transcribed menu until Phase 2 revalidates them.

### D-059 Events, wall, enquiries

- Events: sales per event (sold, checked in, to pay at the cafe, waitlist) for the account's outlets. Attendees: name, masked phone, code, type, paid, check-in. Staff can take payment at the counter before the event ("Mark paid") or collect and check in at once, through the same check-in as the door scanner. Export as CSV with phones still masked. Seats sold in the sample data have no names, and the screen says how many. Creating events and ticket types is later.
- Book wall: approve or reject waiting books; reported spines can come off the shelf or stay (reports cleared). The demo panel's "Staff approve waiting books" from M6 is gone; the book wall's demo panel links to the admin instead.
- Enquiries: newest first, filter by status, move between new, replied and closed, with a staff note. Nothing is sent from the demo.
- Dashboard ("Today"): covers, requests to review, people checked in, orders paid online (counts only, prices are unknown), books waiting, new enquiries, today's bookings, seats by slot for one outlet, and coming events. Each tile appears only for roles that can act on it.
- Admin views reload when another tab changes the demo data, so a booking made in one tab appears in the admin in another.

### D-060 M7 measurements

- Unit: 195 tests (23 new: roles, dashboard, requests, seating rules, capacity and closed dates feeding availability, menu drafts and publish, availability per outlet, PDF checks, attendees and payment at the counter, moderation, enquiries, audit scope, older saved data, routes).
- E2E with the stamp card flag on (as CI builds): 208 pass, 3 skipped by design. Two home clock tests timed out in one slow full run (5.1 min) and passed 63 of 63 when rerun on their own; the same load pattern as M6. New admin flows: a manager approves a group request and the guest sees it confirmed; each role's sections; closing a date closes it for booking; menu draft, publish, PDF warning and sold-out showing on `/menu`; manager limits; marketing moves an enquiry and opens attendees. All axe-clean at 360, 744 and 1440 px, run three times in a row without a failure.
- Lighthouse (default build): accessibility 100 everywhere. LCP medians: `/story` 2.30 s, `/book-wall` 2.30 s, `/enquire` 2.31 s, `/outlets/c-scheme` 2.31 s, `/cold-brew` 2.41 s, home 2.43 s, `/events/coffee-rave` 2.46 s, `/events` 2.49 s, `/menu` 2.60 s, `/book` 2.78 s. `/menu` and `/book` still miss 2.5 s (M8). The menu overlay hook did not move `/menu`.
- Home first-load JavaScript is back under 170 KB after D-055. Lighthouse's own script total (which also counts what loads after the page is idle) still warns on several pages, as before; M8 looks at it with the rest of performance.

## M8: Polish

### D-061 Performance: LCP and INP

**Why Lighthouse's LCP was high.** Lighthouse estimates mobile LCP from a fast local load. Here every script has arrived and run before the first frame, so the estimate charges the page's whole download (HTML, CSS, fonts and all JavaScript at simulated 4G) to the main text's paint. Measured in a real browser with the CPU 4x slower, the first paint and LCP of `/menu`, `/book` and `/story` land at 0.4 to 0.5 s. The fixes cut what the estimate counts, and each one also helps real visitors:

- **Prices read "Rs 290", not "₹290".** The rupee sign lives in the fonts' Latin Extended files, so every menu load downloaded one more font file (about 9 KB) just for that glyph. This also matches the site's "Rs ---" placeholders. Alternatives: subsetting the fonts by hand, or a system font for the sign alone (still a fallback swap).
- **IBM Plex Mono ships one weight (400).** The 500 weight was a second file (about 10 KB) for a few medium labels, which now render at 400. This changes D-007.
- **The booking flow renders on the server and hydrates in place.** It used to render on the client only, so step one's static HTML was replaced by an identical copy after hydration, and the browser counted that as a new, later LCP. The flow now reads the URL and the saved draft through small external stores (`useLocationSearch`, `useDraft`). The server and the hydrating render see an empty query and draft; the real ones arrive straight after.
- **Menu sections below the first skip layout until scrolled near** (`content-visibility: auto`). Layout and paint work on `/menu` fell by about a third; it did not move LCP by itself.

**INP**, measured with the Event Timing API under 4x CPU slowdown (`npm run measure:inp`), was 312 to 680 ms on the booking flow's first "Continue". The fixes:

- **Cached date formatters** (`dateFormat` in `src/domain/time.ts`). Building an `Intl.DateTimeFormat` is slow, and slot maths and date chips built hundreds of them per screen.
- **The browser store keeps the parsed database in memory.** It parses the saved text again only when the text changes (another tab wrote). Before, every service call re-checked the whole database with zod.
- **Service calls yield to the browser before the engine runs**, so the tap's response paints first.
- **The booking flow loads the mock backend once step one is idle** (`warmServices`), so its one long evaluation does not land on the next tap. Only the booking flow does this: other pages call a service as soon as they open anyway. Warming every page made parallel test runs much slower.
- **The step heading takes focus just after the new step paints, not before.** Focusing forces a layout. Screen-reader users still land on the heading, one frame later.
- **The next booking step renders as interruptible work** (`useDeferredValue`). The tap paints at once; step two itself appears 172 to 204 ms after the tap under 4x slowdown, about what it took before. The difference is that the page stays responsive meanwhile.

### D-062 Foldables and dual screens

Blueprint section 6 asks for viewport segments as a progressive enhancement, plus a fallback two-column layout that keeps controls out of a 40 px band around the seam. Three utilities in `globals.css`:

- `fold-grid`: the site's two-column layouts. From the tablet band up, two equal columns with a 40 px centre gap, so a control is never on the fold of an open foldable. Three-column tablet grids (home events teaser) became two columns at tablet, three at laptop. Where the browser reports two screens side by side, the columns follow the screens and the gap covers the seam.
- `fold-segments`: laptop-only splits (1fr / 1.2fr and the like) become one column per screen when two screens are reported.
- `fold-left`: single-column pages (forms, tickets, the menu, the book wall, the admin, legal, 404, offline) stay whole on the left-hand screen when two are reported. The header nav moves to the right-hand screen beside "Book a table" (`fold-nav`).

Tested with Chromium's display-feature emulation: two 540 px screens with a 34 px seam (Surface Duo-like). On every page, no link, button or field overlaps the seam. The fallback is tested at 600, 673, 744 and 884 px: no control in a two-column layout sits within 20 px of the middle.

Not covered: rows of small controls on single-column pages (date chips, time slots, filter chips) can cross the middle of an open foldable that does not report segments. They sit on one screen when segments are reported. To check on real devices in Phase 2.

### D-063 Smaller fixes

- **Double tap on "Review" (from D-039):** the review screen ignores taps in its first 400 ms (`useSettled`), so the second tap can no longer pick a payment or confirm.
- **Book wall layout shift:** the loading placeholder now matches the sample shelf's loaded height at each width (39.3, 32.65 and 17 rem). Measured to within 0.03 rem; it was a fixed 25 rem.

### D-064 Accessibility and responsive pass

- **Keyboard tests (`tests/e2e/keyboard.spec.ts`):**
  - The skip link is the first stop.
  - Every focus stop on the home page (first 25) shows a 2 px focus ring (the amber `--focus-ring`).
  - A table can be booked to the details step with the keyboard alone, with focus moving to each step's heading.
  - The book wall dialog closes with Escape and returns focus to its spine.
  - With reduced motion, the steep clock is not pinned and nothing animates longer than 1 ms.
- **Responsive (`tests/e2e/responsive.spec.ts`):** the brief's other sizes, 393x852, 1366x768 and 1920x1080, across 15 pages. No sideways scroll anywhere, and content stays capped at 1440 px and centred at 1920. Screenshots at those sizes and of the dual-screen view are kept in `tests/screenshots/m8`.
- **axe:** WCAG 2.2 AA (`wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) on every screen of every flow at 360, 744 and 1440 px.

### D-065 Measuring INP

INP is measured in the browser with the Event Timing API, during scripted interactions on the menu, booking and home pages, with the CPU 4x slower. Each test fails above 200 ms (brief).

These timings depend on the machine, so they have their own command, run one test at a time (`npm run measure:inp`, `playwright.measure.config.ts`). The normal e2e run and CI leave them out: run in parallel, or on a busy machine, the same build measured up to three times slower. Field INP from real phones needs real visitors (Blueprint section 15).

### D-066 M8 measurements

- Unit: 195 tests pass.
- E2E on the default build (stamp card off), three workers: 207 pass, 35 skipped by design (stamp card tests, and the keyboard and responsive specs outside the laptop project). One failed under load: typing "96" on the home page at 744 px, which typed before the clock had loaded. The test now waits for the clock, as a person would, and passed 9 of 9 across the three projects.
- New: `keyboard.spec.ts` (5 tests) and `responsive.spec.ts` (15 pages at three more sizes, the foldable fallback at four widths, the dual-screen view). All pass.
- Lighthouse, full run, on a heavily loaded machine (benchmark index 150 to 1,900 against about 1,400 earlier). Accessibility 100 and CLS 0 on every page. LCP medians: `/outlets/c-scheme` 2.33 s, `/story` 2.34 s, `/events` 2.40 s, `/cold-brew` 2.43 s, `/book` 2.49 s, `/menu` 2.52 s, `/book-wall` 2.60 s, `/enquire` 2.63 s, `/events/coffee-rave` 2.66 s, home 3.06 s.
- On the same day (2026-10-17), the M8 working tree and the previous commit measured the same within noise: home 2.93 s and 2.95 s (five runs each), `/enquire` 2.52 s and 2.51 s, `/book-wall` 2.49 s both, `/events/coffee-rave` 2.48 s both. The previous commit's `/book-wall` showed CLS 0.035, which D-063 removes. So the misses above come from the machine's load, not the code.
- Earlier in M8, on a quieter machine: `/menu` 2.46 to 2.50 s (was 2.60 s), `/book` 2.46 s (was 2.78 s), `/story` 2.30 to 2.40 s. In a real browser with the CPU 4x slower, first paint and LCP land at 0.4 to 0.5 s.
- Still warns: total blocking time on pages that load the in-browser backend after idle (`/events`, `/book-wall`, `/events/coffee-rave`), and Lighthouse's script total. Both count the mock engines, which a real backend (Phase 2) would not ship to the browser.
- INP (Event Timing, CPU 4x slower, quiet machine): booking at most 104 ms, menu at most 128 ms, home at most 64 ms, against 200 ms. Not repeated on 2026-10-17 because of the load (D-065).
