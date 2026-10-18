# Carbon: "Brewed Slowly"

An unofficial concept site for Carbon, a craft coffee bar in Jaipur, built as a pitch demo. Mock data
only: no real bookings, payments or messages, and nothing is sent anywhere. Every value Carbon has not
confirmed is shown with a "TBC" tag and listed in `OPEN_QUESTIONS.md`.

## Run it

```bash
npm install
npm run dev                       # http://localhost:3000
npm run build && npm start        # production build (needed for the offline service worker)
```

Feature flags (build time, `.env.local` or Vercel Environment Variables, then rebuild):

- `NEXT_PUBLIC_FLAG_STAMP_CARD=true` turns on the stamp card (`/my-carbon`, the stamp side of `/staff`). Off by default.
- `NEXT_PUBLIC_FLAG_3D=false` turns off the 3D layer (three.js) and keeps the SVG and HTML versions. On by default; it also stays off for reduced motion, Save-Data, low-memory devices and screens under 390 px.
- `NEXT_PUBLIC_BOOKING_TRANSPORT=http` sends bookings through the route handlers instead of the in-browser engine.

## A five-minute demo

1. **Home** (`/`): scroll to steep the cold brew from 0 to 96 hours, or type "96" anywhere.
2. **Menu** (`/menu`): search, filter, the periodic table of signatures, the PDF download. A table QR opens `/menu?src=qr&outlet=c-scheme`.
3. **Book** (`/book`): a table for two is instant; a group of seven or more (above P-01, six) sends a request. Open "Demo controls" at the foot of the page to expire the hold.
4. **Admin** (`/admin`): sign in as "Manager, C Scheme", approve the request under Bookings, then open the guest's `/book/<code>` page and the Audit log.
5. **Events** (`/events/coffee-rave`): buy a ticket, pick Success, Failed or Pending on the sample payment sheet, and open the ticket's QR. `/events/drip-it-up` is sold out with a waitlist.
6. **Book wall** (`/book-wall`): add a book, then approve it as Marketing in `/admin/wall`.

All demo data lives in the visitor's browser (localStorage), so each device has its own. "Reset demo data" in Demo controls starts over.

## Pages

| Route                                    | What it is                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------------- |
| `/`                                      | Home: steep clock, today at Carbon, signatures (no prices), outlets, events, proof, book wall |
| `/menu`                                  | Structured menu (166 items), search, filters, periodic view, PDF download                     |
| `/cold-brew`                             | The 18 to 96 hour story and the steep explorer                                                |
| `/outlets`, `/outlets/[slug]`            | Three outlets; unconfirmed addresses are marked                                               |
| `/story`                                 | Brand, awards, press titles                                                                   |
| `/book`, `/book/[code]`                  | Six-step booking; manage, change or cancel by code                                            |
| `/events`, `/events/[slug]`              | Sample events, seat holds, waitlist                                                           |
| `/checkout/[orderId]`, `/tickets/[code]` | Pay online or at the cafe; signed QR ticket; cancel and refund                                |
| `/my-carbon`, `/staff`                   | Stamp card (flag) and the staff scanner, including the event door                             |
| `/book-wall`, `/book-wall/add`           | Shelf of spines drawn from titles; add a book for approval                                    |
| `/enquire`                               | Catering, collab or launch, workshop, other                                                   |
| `/admin/*`                               | Back office with a role switcher (owner, manager, barista, marketing)                         |
| `/legal/*`, 404, `/offline`              | Placeholder legal text, friendly errors, offline fallback                                     |

## Check it

```bash
npm run check          # typecheck, lint, format, unit tests
npm run build
npm run e2e            # Playwright + axe at 360, 744 and 1440 px, plus 393, 1366, 1920 and a dual-screen view
npm run measure:inp    # INP with a 4x slower CPU, one test at a time (run on a quiet machine)
npm run lhci           # Lighthouse budgets against the production build
```

Locally, `PW_CHANNEL=msedge` uses the installed Edge if Playwright's Chromium is not installed. Screenshots land in `tests/screenshots/latest`; each milestone's set is kept in `tests/screenshots/m1` to `m8`.

## Deploy

Vercel, from the repository root, with the default Next.js settings. No secrets are needed: payment signing keys in the demo are fixed sample values in code, clearly named as such. The demo is not indexed (`robots: noindex`).

## How it is built

- Next.js 16 (App Router), strict TypeScript, Tailwind v4 tokens, GSAP for the steep clock only, zod for validation. Dependencies and why: `DECISIONS.md` (D-001, D-002, D-033).
- `src/domain`: pure rules and state machines (availability, booking and order machines, stamp card, wall, admin roles).
- `src/services`: typed interfaces. `src/services/mock`: engines over one in-memory database, saved in the browser for the hosted demo (D-026). `src/app/api/*`: route handlers with the same engines, shaped like the Phase 2 API.
- `src/config/placeholders.ts`: every unconfirmed value, mirrored in `OPEN_QUESTIONS.md` under the same id.
- `src/content/copy.ts`: customer-facing copy. `src/content/admin-copy.ts`: back-office copy.
- `src/styles/tokens.css`: Night and Paper themes. `/styleguide` shows the palette and type.

## Documents

- `docs/BRIEF.md`, `docs/blueprint.md`, `docs/pitch-plan.md`: the brief and plans (originals in `docs/originals`).
- `DECISIONS.md`: what was decided, why, and the alternatives, milestone by milestone, with measurements.
- `OPEN_QUESTIONS.md`: placeholders, questions for Carbon, answered questions.
- `docs/case-study.md`: case-study notes (not for publication without Carbon's agreement).
