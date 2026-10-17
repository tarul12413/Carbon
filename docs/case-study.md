# Case-study notes: Carbon, "Brewed Slowly"

Working notes for a case study, following the outline in Blueprint section 15. Nothing here is for
publication until Carbon agrees, including which numbers may be shown (Blueprint section 15).
Facts about Carbon come from the pitch plan's audit and Carbon's March 2026 menu PDF; each is
sourced below. Everything else describes the demo.

## 1. Context

- Carbon is a craft coffee bar with three outlets in Jaipur. Its brand is strong; the digital presence
  it owns is thin. Discovery, reservations and ordering run on other companies' platforms (Google,
  Zomato, Swiggy, EazyDiner, District), and its own channel is a link-in-bio page with no brand story
  (pitch plan, audit round 1).

## 2. Audit (a snapshot, not a ranking)

From the pitch plan's audit. Ratings and counts were read once and change daily.

- Google: 4.3 stars, about 636 reviews; reservations only through aggregators.
- Zomato / District: 4.1 stars; ambience 4.0, food 4.0, service 4.1.
- Instagram: 420 posts, 4,638 followers.
- "cold brew jaipur" on Google Places: Carbon appears near the bottom of the visible listings, and
  its 4.3 is the lowest rating among them (audit round 3; results vary by searcher).
- The third outlet may have two Google listings with different addresses; unverified, so the demo
  marks that address as to be confirmed (P-09).

## 3. Insight

The printed menu gives a steep time for every cold brew, from 18 to 96 hours. No channel Carbon
uses shows it, and its own bio says "you cannot miss our cold brews".

## 4. Concept

The site is a cold brew: scrolling the home page steeps it. A pinned stage scrubs a counter from 0 to
96 hours and fills a hand-drawn glass; each brew is named at its real steep time. Typing "96" anywhere
runs the clock to the end. Native scrolling throughout (no scroll hijacking); reduced motion and small
landscape phones get stacked cards instead (D-013).

## 5. Design system

- Palette from the brief, sampled from Carbon's own menu: carbon black, graphite, pewter, bone,
  concrete, amber, ember, leaf, paper, ink. Two themes: Night for the site, Paper for the menu, like
  the printed one. Paper needed darker accents to pass contrast; those are derived, not Carbon's
  (D-005, D-006).
- Type: Jost for everything, IBM Plex Mono for steep times, codes and prices (D-007; one mono weight
  since M8, D-061).
- Placeholders are visible on purpose: every unconfirmed value carries a "TBC" tag tied to an id in
  `src/config/placeholders.ts` and `OPEN_QUESTIONS.md` (D-016).

## 6. Flows

- Booking: six steps, instant for small groups and a request for large ones (threshold P-01), a held
  table with a visible countdown, pay at the cafe or an optional online deposit, and a manage page by
  booking code (M3, M4).
- Events: tickets with a seat hold, three payment outcomes on a clearly labelled sample payment sheet,
  a signed QR ticket, cancel and refund, and a waitlist that offers freed seats in order (M4).
- Stamp card behind a feature flag, staff scanner, book wall, enquiries (M5, M6).
- Admin with a role switcher: requests, capacity and hours, menu drafts and the PDF warning,
  attendees and check-in, moderation, enquiries, audit log (M7).

## 7. Architecture and trade-offs

- Phase 1 is a front end with typed service interfaces and mock engines. The engines are pure
  functions over one database object, so the same rules run in the browser (the hosted demo keeps its
  data in localStorage, which survives serverless instances: D-004, D-026) and behind route handlers
  shaped like the planned API (`/api/*`).
- Every write takes an idempotency key; payments follow the webhook-as-truth pattern with signed,
  once-only events (D-028, D-035).
- Phase 2 (Blueprint section 8): a modular monolith on Postgres, slot locks in transactions, the
  payment gateway's webhooks, WhatsApp for messages, staff sign-in by magic link.

## 8. Edge cases solved (all covered by tests)

- The last table: one hold wins; the other guest is offered the nearest free times.
- The double tap: one booking, one order, one stamp; and since M8 the second tap of a double tap on
  "Review" can no longer pick the payment.
- The closed tab: the payment webhook completes the order; money that arrives after a hold ran out is
  refunded automatically.
- The hold that runs out while typing, the sold-out event (waitlist), the forwarded ticket (each QR
  checks in once), the shared stamp-card QR (60-second tokens).

## 9. Results (lab only; Carbon has not launched anything)

- Accessibility: Lighthouse 100 and axe clean (WCAG 2.2 AA) on every screen of every flow at 360,
  744 and 1440 px. The keyboard alone can book a table, focus rings are always visible, and reduced
  motion turns off the pinned steep clock.
- Layout: no sideways scroll at 360, 393, 744, 1366, 1440 or 1920 px; on a dual-screen device no
  control sits on the seam.
- Speed (lab, mid-range phone simulated): CLS 0 everywhere. With the CPU 4x slower in a real
  browser, first paint and LCP land at 0.4 to 0.5 s, and taps respond in at most 128 ms (INP budget
  200 ms). Lighthouse's simulated LCP is 2.3 to 2.5 s on a quiet machine, against a 2.5 s budget.
- Tests: 195 unit tests and about 240 browser tests across three screen sizes (D-066 has the
  numbers and the caveats).

## 10. What I would do next

- Answer the open questions with Carbon (`OPEN_QUESTIONS.md`), then replace placeholders with real
  rules, prices and hours.
- Real photography of the outlets and the steep (no stock).
- Phase 2: the API and database, so booking and payment rules run on the server and the in-browser
  engine (about 100 KB) leaves the client.
- After launch, measure what Blueprint section 15 lists: LCP, INP and CLS from real users; direct
  versus aggregator bookings; booking completion; event sell-through; no-shows; WhatsApp clicks.

## What to capture

- Screenshots: `tests/screenshots/m1` to `m8` (each flow at 360, 744 and 1440 px; the extra sizes and
  a dual-screen view in `m8`).
- Lighthouse reports: `npm run lhci` writes them to `.lighthouseci/`.
- Still to record by hand: a 30-second screen recording of the steep clock on a phone.
