ROLE
You are a senior full-stack engineer and front-end designer building a pitch-grade demo website for Carbon Cafe, a craft coffee bar in Jaipur, India. I am Tarul, a freelance full-stack developer pitching this to the founders. Work like a careful teammate: read first, ask when something is missing, never invent facts.

WORKING RULES
1. Read every file in /docs before writing code. Order of authority: this prompt, then Carbon_Design_Blueprint, then Carbon_Pitch_Website_Plan. If they conflict, follow this prompt and record the conflict in OPEN_QUESTIONS.md.
2. If something is missing or ambiguous, ask me. Do not assume. Where I have given a placeholder, use it, keep it in one config file marked as a placeholder, and list it in OPEN_QUESTIONS.md.
3. Never invent prices, policies, hours, addresses, awards, testimonials or claims. Use only facts from the docs or the menu PDF.
4. Work in milestones (below). After each one: stop, run the quality checks, summarise what changed, how to run it and any questions, then wait for my go-ahead.
5. Keep DECISIONS.md up to date (what, why, alternatives considered). It becomes my portfolio case study.
6. Ask before adding any dependency not listed here.
7. Small commits, strict TypeScript, no commented-out code.

FIRST STEP, BEFORE ANY CODE
Reply with: (a) your understanding in at most 15 bullets, (b) conflicts or gaps you found in the docs, (c) the folder structure you propose, (d) the questions you need answered before Milestone 0. Then wait for me.

PROJECT AND GOAL
Carbon has three outlets in Jaipur (C Scheme, Raja Park / Tilak Nagar, Vaishali Nagar), a dark industrial brand, and seven signature cold brews steeped 18 to 96 hours. Its booking, ordering and discovery run on Zomato, Swiggy, EazyDiner and Google; its own "website" is a link-in-bio page. Build a demo that shows what a Carbon-owned site can be. Concept: "Brewed Slowly". The home page behaves like a cold brew, and scrolling steeps it.

PHASE 1 SCOPE
A front-end prototype where every flow is clickable end to end with mock data. No real backend, payments, OTP or WhatsApp yet. Put all data access behind typed service interfaces in /src/services with mock implementations (in-memory store seeded from JSON, exposed through Next.js route handlers that match the endpoint shapes in Blueprint section 9). Phase 2 will swap in Postgres, Razorpay, an SMS provider and WhatsApp without touching UI code. Demonstrate: seat and table holds with a countdown, idempotency keys, double-submit protection, and the booking and order state machines from Blueprint section 9.

LOCKED DECISIONS
- Payments: customers can pay online or pay at the cafe.
- Table booking: instant confirmation for small groups, request-and-approve for large groups. Threshold is a placeholder (6 or fewer is instant), configurable per outlet.
- Stamp card: optional feature flag, off by default, phone number plus OTP sign-in only. Carbon may not have a stamp card yet.
- No prices on the home page. Prices appear on the menu page only.
- Menu: a structured menu plus a PDF download.
- QR on tables opens /menu?src=qr&outlet=<slug>. No ordering from the QR. No food ordering or delivery in this phase.

TECH STACK
Next.js (App Router, current stable) with strict TypeScript. Tailwind CSS with CSS variables for design tokens. GSAP with ScrollTrigger for scroll scenes; Motion for small UI effects. next/font for fonts. zod for validation. Vitest for unit tests, Playwright for end-to-end tests at mobile, tablet and desktop viewports, axe for accessibility, Lighthouse CI. Native scrolling only. No scroll hijacking.

DESIGN SYSTEM
Two themes. Night (default) and Paper (used on the menu page, mirroring the printed menu).
Tokens: carbon-black #121212 (page), graphite #211F20 (cards), pewter #393536 (borders, raised surfaces), bone #ECE7DF (text on dark), concrete #9A968F (secondary text), amber #D98E3B (accent, focus rings, clock), ember #D9553F (sold out, errors; icons and large text only), leaf #6FA37B (open now, success), paper #D2D2D2 and ink #373737 (Paper theme).
Fonts: Jost (variable, weights 400 to 700) for text and UI, with uppercase tracked headings for category titles; IBM Plex Mono for the steep clock, prices, booking and ticket codes. Fluid type with clamp(); body never below 16px. Minimum body weight 400, use bone not pure white.
Shape: 4 to 6px radii, 1px pewter hairlines, almost no shadows, a static noise overlay at 3 to 4 percent opacity, the square grid-line motif from Carbon's brand pages as dividers. Line icons at 1.5px.
Voice: short, dry, confident, no jargon. Examples: "Okay. Come have one." "Table's yours." Keep all user-facing copy in one content file so I can edit it.

ROUTES AND FEATURES
/ Home. Sections: drop hero, steep clock, Today at Carbon (open now, computed from outlet hours), signatures (no prices), three outlets, events teaser, proof (awards and press titles), book wall teaser, footer with hours and WhatsApp link.
Steep clock: pinned scene; scroll scrubs a counter from 0 to 96h and fills a hand-drawn glass (SVG roughness filter for wobble). Digits "strike" in with a small random tilt (typewriter feel). A typed line names the drink at its real steep time: 18h Whiskey Barrel, 24h Mango Passion, 28h The Original and Tropical Monk, 36h Mint Lime, 96h Vanilla Orange and Berry Bold. No prices. Reduced motion or small phones in landscape: stacked cards, no pin. Keyboard next and previous controls. The clock value is real text. Typing "96" anywhere runs the clock to the end.
/menu Structured menu (about 160 items in about 25 sections). Search, filters, categories, list view and a periodic-table view for signature items only (always offer a plain list). Steep-time chips on cold brews. Paper theme. "Download the PDF menu" link. Prices shown here.
/cold-brew The 18 to 96 hour story with a steep explorer.
/outlets and /outlets/[slug] One page per outlet.
/book and /book/[code] Six-step flow: outlet, date and time, party size, details, review and pay choice, confirmation. Small group: instant. Large group: request form, status Requested. 10-minute hold with countdown (placeholder). Pay at cafe or pay online (online is an optional deposit, amount shown as "Rs ---"). Manage page by booking code: calendar file, change or cancel within a placeholder window.
/events and /events/[slug] List, detail, ticket quantity, 10-minute seat hold, sold-out waitlist.
/checkout/[orderId] Choose pay online or pay at the cafe. A clearly labelled sample payment sheet (never imitate a real gateway's branding) with selectable outcomes in a dev panel: success, failed, pending. Ticket page with a QR for a signed mock token. Cancel and refund screen with placeholder rules.
/enquire Catering, collab or launch, workshop, other.
/my-carbon Stamp card (feature flag). Phone plus OTP (mock code shown only in a dev toast), consent checkbox with a notice version, 8-stamp card (placeholder), QR token that rotates every 60 seconds. /staff mock scanner with a "simulate scan" button, add stamp with minimum gap and undo, redeem with outlet PIN (mock).
/book-wall Shelf of spines generated from title hash (colour and height; no cover images), add-book form with length limits and a mock bot check, entries wait for approval, duplicate titles merge with a reader count.
/story Brand, awards (EazyDiner Foodie Awards Best Cafe; Zomato Restaurant Awards 2025 Top 10 in Coffee, Jaipur; Travel + Leisure Delicious Dining 2025 Best Cafe), press titles only with placeholder links (Hospemag, Restaurant India, Curly Tales). Do not copy article text.
/legal/* Privacy, terms, cancellation and refund pages with placeholder text clearly marked.
/admin/* Mock sign-in with a role switcher (Owner, Manager, Barista, Marketing). Dashboard, bookings (approve or decline requests), capacity and hours, menu editor (name, price, steep hours, notes, tags, availability, mock PDF upload with a warning if items changed after the upload), events and attendees with check-in, wall moderation, enquiries inbox, audit log. Managers see their outlet only.
404 and offline pages with friendly copy.

RESPONSIVE
Mobile first. Bands in CSS px: 320 to 389, 390 to 599, 600 to 1023, 1024 to 1439, 1440 to 1919, 1920 and up (cap content near 1440 and centre it). Use small-viewport units instead of 100vh, safe-area insets, 44px minimum touch targets, container queries for components, hover effects only for fine pointers. Foldables and dual-screen: treat as progressive enhancement with the CSS viewport-segments media features, and always provide a fallback layout that keeps interactive elements out of a 40px seam. Test at 360x800, 393x852, 744x1133, 1366x768, 1440x900 and 1920x1080.

QUALITY GATES (targets)
LCP 2.5s or less on a mid-range phone over 4G, INP 200ms or less, CLS 0.1 or less, JavaScript on the home route 170KB gzipped or less, hero image 120KB or less. WCAG AA contrast, visible amber focus rings, full keyboard use, prefers-reduced-motion respected. Unit tests for availability math, booking rules (instant versus request), hold expiry, idempotency and the state machines. Playwright flows at 360x800, 744x1133 and 1440x900 for: book a small table, request a large group, buy an event ticket (all three payment outcomes), join the waitlist, add a book to the wall, admin approves a request. Save screenshots from these runs.

SEED DATA
Menu: transcribe from /docs/menu.pdf into /data/menu.json. The PDF has 24 pages, its text is converted to outlines, and it mixes menu pages with brand pages. Use the page images, verify every item and price against the page, and flag anything unreadable instead of guessing. Each item: category, name, notes, price in paise, steep hours (cold brews only), tags, availability. The food menu appears fully vegetarian and there are no alcoholic drinks; confirm with me before stating either on the site.
Outlets: C Scheme (F-6A, Ground Floor, Amir Manzil, Ramesh Marg, C Scheme, Jaipur), Raja Park / Tilak Nagar (Shanti Path, building number unknown), Vaishali Nagar (address conflicts between sources: leave as TBD and ask me).
Hours: public listings conflict (9:00 to 23:45 on Google, Zomato and District; 23:59 on Swiggy; "9am till midnight" on Instagram). Use 9:00 to 23:45 as a placeholder and ask me.
Placeholders (in one config file): group threshold 6, hold length 10 minutes, ticket and deposit prices "Rs ---", cancellation window "X hours", stamp reward at 8, group-request reply time "X hours".

IMAGES
No stock photos. Do not hotlink or scrape images from Carbon, Instagram, Zomato or anywhere else. Use clearly labelled placeholder frames; I will drop real photos into /public/images later.

DO NOT
Use Inter, Space Grotesk, purple gradients, glassmorphism or generic hero copy. Hijack scrolling. Store real phone numbers or any real personal data. Add real API keys. Assume any rule, price or policy I have not given you.

MILESTONES (stop after each and wait for my go-ahead)
M0 Repo, tooling, tokens, fonts, CLAUDE.md, DECISIONS.md, OPEN_QUESTIONS.md, CI.
M1 Design system components and the home page with the steep clock.
M2 Menu (with PDF download), outlets, cold-brew page, story.
M3 Booking flow, manage booking, mock service layer, state machines, tests.
M4 Events, waitlist, checkout, sample payment sheet, tickets, cancel and refund.
M5 Stamp card, staff scanner (feature flag).
M6 Book wall, enquiry form, legal pages, 404 and offline.
M7 Admin with role switcher.
M8 Polish: accessibility, performance, responsive pass, README, final screenshots and case-study notes.

DEFINITION OF DONE
Every flow works on a phone, a tablet and a laptop with mock data. All gates pass or are listed as known gaps with reasons. All placeholders are in one config file and in OPEN_QUESTIONS.md. DECISIONS.md explains every major choice.