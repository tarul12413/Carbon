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
