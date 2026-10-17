# Carbon: "Brewed Slowly"

An unofficial concept site for Carbon, a craft coffee bar in Jaipur. It is a pitch demo with mock data only: no real bookings, payments or messages.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

## Check it

```bash
npm run check        # typecheck, lint, format, unit tests
npm run build
npm run e2e          # Playwright + axe at 360, 744 and 1440 px (PW_CHANNEL=msedge to use installed Edge)
npm run lhci         # Lighthouse budgets
```

## Where things are

- `docs/`: brief, blueprint, pitch plan, wireframes, menu PDF
- `src/config/placeholders.ts`: every unconfirmed value, mirrored in `OPEN_QUESTIONS.md`
- `src/content/copy.ts`: all user-facing copy
- `src/styles/tokens.css`: design tokens (Night and Paper themes)
- `/styleguide`: palette and type specimen
- `DECISIONS.md`: what was decided and why

## Booking (M3)

- `/book` runs the six-step flow; `/book/CRB-1234` confirms and manages a booking.
- Bookings live in your browser (localStorage) in the hosted demo, so a booking made on one device is not visible on another. "Demo controls" at the foot of the booking pages expire holds or reset the demo data.
- Rules: `src/domain/booking`. Mock engine: `src/services/mock/bookingEngine.ts`. Route handlers with the same rules: `src/app/api`. Set `NEXT_PUBLIC_BOOKING_TRANSPORT=http` to send the UI through them.

## Events and checkout (M4)

- `/events` lists the labelled sample events; `/events/coffee-rave` sells tickets, `/events/drip-it-up` is sold out with a waitlist.
- `/checkout/<order>` offers pay online or at the cafe. Paying online opens a clearly labelled sample payment sheet; with the dev panel on, pick Success, Failed or Pending there.
- `/tickets/<code>` shows the signed QR; `/tickets/<code>/cancel` cancels and refunds.
- "Demo controls" at the foot of these pages: open a seat for the waitlist, play the bank on a pending payment, expire holds, reset demo data.

## Stamp card and staff scanner (M5)

- The stamp card is off by default. Build or run with `NEXT_PUBLIC_FLAG_STAMP_CARD=true` (on Vercel: Environment Variables, then redeploy) to show `/my-carbon` and the stamp side of `/staff`.
- `/my-carbon`: phone, consent, then the six-digit code from the "Demo SMS" toast. "Show QR to barista" shows a QR that changes every minute.
- `/staff`: pick a sample account and outlet. In a second tab, "Simulate scan" reads the QR the My Carbon tab is showing; add a stamp, undo it, or look up `90000 00202` to redeem a full card with the demo PIN `1896`. "Event door" checks tickets in once.

## Book wall, enquiries, legal and offline (M6)

- `/book-wall` shows the sample shelf; tap a spine for its detail. `/book-wall/add` sends a book, which waits until staff approve it in the admin (`/admin/wall`).
- `/enquire` takes catering, collab or launch, workshop and other enquiries; `/enquire?type=collab` preselects one.
- `/legal/privacy`, `/legal/terms`, `/legal/refunds` are placeholder text. Unconfirmed values are written as `[[placeholderKey]]` in `copy.ts` and filled from `placeholders.ts`.
- Offline: `public/sw.js` runs in production builds only (`npm run build && npm start`). Open a page, switch the network off and reload it; a page you have not opened shows `/offline`.

## Admin (M7)

- `/admin` opens with a sample sign-in. Pick a role; switch account or outlet at the top of any admin page. Each role sees only its sections (Blueprint section 10).
- Try: send a group request from `/book` (more than 6 people), then approve it as the outlet's manager in `/admin/bookings`; the guest's `/book/<code>` page shows it confirmed and `/admin/audit` logs it.
- `/admin/capacity` changes seats per slot, hours and closed dates; booking slots on this device follow at once. `/admin/menu` drafts and publishes edits, switches items sold out per outlet, and checks a new PDF; `/menu` on this device shows the result.
- Admin data lives in this browser with the rest of the demo. `/api/admin/*` mirrors it for Phase 2, with the account in an `x-demo-staff` header.
- Back-office text lives in `src/content/admin-copy.ts`; customer text stays in `src/content/copy.ts`.
