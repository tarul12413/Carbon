@AGENTS.md

# Carbon Cafe Jaipur: pitch demo

Read docs/BRIEF.md first. It is the full brief. Then docs/blueprint.md and docs/pitch-plan.md
(converted from docs/originals/*.docx; the .docx wins if they disagree).
Authority order: BRIEF.md, then blueprint, then pitch plan. Log conflicts in OPEN_QUESTIONS.md.

## Working rules

- If something is missing or ambiguous, ask me. Never assume.
- Never invent prices, policies, hours, addresses, awards or claims.
- Placeholders live in src/config/placeholders.ts and in OPEN_QUESTIONS.md (same ids).
- All customer-facing copy lives in src/content/copy.ts; back-office copy (admin, staff scanner) in src/content/admin-copy.ts.
- Work in milestones M0 to M8. Stop after each one, summarise, and wait for my go-ahead.
- Keep DECISIONS.md current (what, why, alternatives).
- Dependencies: use whatever is best for the job, pinned exactly, at least two weeks old unless a security fix needs newer. Record each one in DECISIONS.md.
- Strict TypeScript, small commits, no commented-out code.

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm run check` runs typecheck, lint, format check and unit tests
- `npm run e2e` runs Playwright at 360x800, 744x1133, 1440x900. Locally set `PW_CHANNEL=msedge` if Playwright's Chromium is not installed.
- `npm run lhci` runs Lighthouse CI against a production build

## Layout

- `src/app` routes, `src/components`, `src/domain` (pure rules and state machines), `src/services` (typed interfaces + mock implementations), `src/config`, `src/content`, `src/lib`, `src/styles`
- `data/` seed JSON, `tests/unit`, `tests/e2e`, `tests/screenshots/<milestone>`

## Locked decisions

- Pay online or pay at the cafe.
- Booking: instant for small groups, request for large groups (threshold is a placeholder).
- Stamp card: feature flag, off by default, phone plus OTP only.
- No prices on the home page. Menu is structured plus a PDF download.
- Table QR opens /menu?src=qr&outlet=<slug>. No ordering from the QR.
- Phase 1 is a front-end prototype with mock data behind service interfaces.
- Demo is deployed on Vercel. Mock state must survive serverless instances (see DECISIONS.md D-004).

## Never

- Hotlink or scrape images. No stock photos.
- Hijack scrolling. No Inter, Space Grotesk, purple gradients or glassmorphism.
- Real personal data or real API keys.
