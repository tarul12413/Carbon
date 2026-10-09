# CARBON CAFÉ JAIPUR

> Converted from `originals/Carbon_Design_Blueprint.docx` on 2026-10-09. Figures are in `docs/wireframes/`. If this file and the .docx disagree, the .docx wins.

Design Blueprint: “Brewed Slowly”

Ideation, wireframes, architecture, HLD and LLD, edge cases and costing, written so it can become a portfolio case study. Version 1.1, 8 October 2026. Vendor prices and rules were researched in October 2026; re-check them before quoting a client.

Contents: 1 Decisions and open items. 2 Ideation. 3 Look and feel. 4 Sitemap and pages. 5 Wireframes and flows. 6 Responsive plan. 7 Motion and smoothness. 8 Architecture (HLD). 9 Detailed design (LLD). 10 Admin panel. 11 Edge cases. 12 Security and privacy. 13 Scalability and expansion. 14 Costing. 15 Case-study kit. 16 Next steps.

## 1. Decisions and Open Items

### Confirmed by you

| Topic | Decision |
| --- | --- |
| Payments | Customers can pay online or pay at the café. |
| Table booking | Instant confirmation for small groups; request-and-approve for large groups. |
| Stamp card | Phone number plus OTP sign-in only, and only if Carbon has a stamp card system. My searches found no sign that Carbon runs one, so the module is optional and off by default until confirmed. |
| Home page | No prices on the home page. Prices live on the menu page. |
| Menu | A structured menu (searchable, with steep times and tags) plus a PDF download of the printed menu. |
| QR in the café | The table QR opens the live menu first. Ordering from the QR comes later, and only if Carbon's billing system supports it (see section 13). |
| Working rule | If something is missing, ask before assuming. Every placeholder below is labelled so nothing is silently decided. |

### Open items (please confirm; placeholders are used until you do)

| # | Question | Placeholder used in this document |
| --- | --- | --- |
| 1 | What group size counts as small (instant) versus large (request)? | 6 or fewer is instant. Configurable per outlet. |
| 2 | Which things can be paid online: table deposit, event tickets, workshops, bottled cold brew? | Every payable type has its own on/off switch in admin. Wireframes show events and an optional table deposit. |
| 3 | Does Carbon already run a stamp card or loyalty scheme? What are the reward rules? | Module off by default. When on: 8 stamps for a reward. |
| 4 | For pay-at-café events: how long is a seat held, and what is the cancellation and refund window? | “X hours”, set by Carbon in admin. |
| 5 | Table capacity per outlet, slot length and how long a table is occupied? | Fields exist in the data model; no numbers assumed. |
| 6 | Who uses the admin panel: founders, outlet managers, baristas? | Four roles proposed: Owner, Manager, Barista, Marketing. |
| 7 | Is a Hindi version needed? | English only; Devanagari font plan noted in section 3. |
| 8 | Brand assets: original fonts, logo files, permission to use their photos? | Fonts proposed in section 3; photos are placeholders. |
| 9 | Age rules for Coffee Raves; GST and food-licence details for bottled cold brew sales? | Not designed yet. |
| 10 | How fast do staff reply to large-group requests? | “Within X hours” in the copy. |
| 11 | Which POS or billing system does Carbon use, and does it offer QR ordering? | QR ordering not designed; the QR opens the menu. |
| 12 | Can Carbon supply a menu-only PDF? The file I have mixes menu pages with brand pages. | Use the menu pages of the March 2026 file. |

## 2. Ideation

### The concept

Carbon's printed menu lists seven signature cold brews, each with its own steep time: 18, 24, 28, 28, 36, 96 and 96 hours. The site makes a visitor feel that time. The home page behaves like a cold brew: a drop falls into black, a steep clock counts from 0 to 96 hours as you scroll, and each drink appears at its real steep time.

### Design principles

1. Slow on purpose, fast in use. The story takes its time, but booking takes about a minute. From the home page, a confirmed table should take no more than five steps.
2. Dark, not gloomy. Warm amber light on near-black, the way Carbon's interiors look in photos.
3. Sound like Carbon. Short, dry, confident. The press describes the brand as great coffee without a lecture: dark, bold, slightly rebellious. No jargon.
4. Real over stock. Real prices, real steep times, their own photography. No stock images.
5. Calm motion. Animation explains something or it is removed. Reduced-motion users get a still version.
6. Owned, not rented. Direct booking, WhatsApp and a stamp card, so customers have a way to reach Carbon that is not an aggregator.
### Voice, with draft examples to refine with the founders

| Do | Avoid |
| --- | --- |
| “Okay. Come have one.” | “Welcome to our cozy café!” |
| “Steeped 96 hours. Worth the wait.” | “Our artisanal, ethically sourced single-origin…” |
| “Table's yours.” | “Your reservation has been successfully processed.” |
| “No money was taken, or it will be refunded automatically.” | “Transaction error code 502.” |

### Human touches

- A hand-drawn drip and a typewriter-style steep clock instead of generic loaders.
- “Today at Carbon”: open or closed right now, computed from each outlet's hours, plus the next event.
- The four glyphs in Carbon's mark (leaf, circle, dot grid, waves) assemble as the page-transition animation.
- An easter egg: type “96” anywhere and the clock runs to the end.
- Later idea: a live batch tracker (“Vanilla Orange, ready in 6 hours”), set by staff in admin.
## 3. Look and Feel

### Colour, matched to Carbon

Two colours were sampled directly from Carbon's own menu PDF: the light grey of the printed menu pages (#D2D2D2) with its dark text (#373737), and the warm charcoal of the brand pages (#393536). The rest come from the photos: near-black interiors, warm bulb light, red brewing kettles and plants.

| Token | Hex | Use | Contrast |
| --- | --- | --- | --- |
| Carbon Black | #121212 | Page background (dark theme) | base |
| Graphite | #211F20 | Cards and panels | base |
| Pewter | #393536 | Borders, raised surfaces (sampled from the brand pages) | Bone on Pewter 9.8:1 |
| Bone | #ECE7DF | Main text on dark. Warm off-white, never pure white | 15.2:1 on Black |
| Concrete | #9A968F | Secondary text | 6.4:1 on Black, 5.6:1 on Graphite |
| Amber | #D98E3B | Accent: buttons, steep clock, links, focus rings | 7.0:1 on Black; black text on Amber 7.0:1 |
| Ember | #D9553F | Sold out, errors, cancel. Icons and large text only | 4.7:1 on Black, 4.2:1 on Graphite |
| Leaf | #6FA37B | Open now, success, vegetarian dot | 6.4:1 on Black |
| Paper | #D2D2D2 | Menu background (sampled from the printed menu) | — |
| Ink | #373737 | Text on Paper (sampled) | 7.9:1 on Paper |

All text pairs meet WCAG AA (4.5:1) except Ember on Graphite, which is why Ember is limited to icons, large text and status chips.

Two themes: Night (default) and Paper. Paper is used on the menu page to mirror the printed menu, and doubles as a daylight mode for reading outdoors.

### Typography

Carbon's menu PDF has its text converted to outlines, so I could not read the font names. The printed menu looks like a geometric sans: bold uppercase headings, light body, light italic descriptions. Please ask Carbon whether they own a licence; if they do, use theirs. Otherwise:

| Role | Font | Why |
| --- | --- | --- |
| Headlines, body, UI | Jost (variable, weights 400 to 700) | Geometric and Futura-inspired, close to the printed menu's character. One variable file covers every weight. Uppercase with slight letter-spacing for category titles, as on the menu. Free under the Open Font License. |
| Numbers and data | IBM Plex Mono | The steep clock, prices, booking and ticket codes. Monospaced digits keep the counter from jittering while it counts, and the lab feel fits the “element C” idea. Free under the Open Font License. |
| Hindi, if needed | Noto Sans Devanagari | Only if open item 7 says yes. Loaded only on Hindi pages. |

### Why only those fonts

- Two families means two network requests and a consistent voice. Each has one job.
- Neither is a default template font, so the site does not read as generated.
- Both are free for commercial use and self-hosted through the framework's font loader, with an automatic fallback sized to match, so text does not jump when the font loads.
- On dark backgrounds thin weights shimmer. The minimum body weight is 400, with 500 for small text, and text uses Bone rather than pure white.
### Type scale (fluid, no breakpoints needed)

| Step | Size | Use |
| --- | --- | --- |
| Display | clamp(3rem, 1.2rem + 8vw, 7.5rem) | Home hero, “Brewed slowly.” |
| Clock | clamp(5rem, 2rem + 16vw, 14rem) | Steep clock digits (Plex Mono) |
| H1 / H2 / H3 | clamp(2.25rem to 4.5rem) / clamp(1.75rem to 2.75rem) / 1.5rem | Page and section titles |
| Body | clamp(1rem, 0.95rem + 0.25vw, 1.125rem) | Never below 16 px; line height 1.55 |
| Small | 0.875rem | Captions, legal, tags |

### Shape, texture and motif

- Small radii (4 to 6 px) and 1 px Pewter hairlines. Industrial, not bubbly. Almost no shadows.
- The square grid-line motif from Carbon's brand pages appears as section dividers and in the gutters on very wide screens.
- A static noise overlay at 3 to 4 percent opacity suggests raw concrete. It is static, so it costs no animation budget.
- Icons are 1.5 px line icons. Photography is dark and warm, shot by you at the outlets.
## 4. Sitemap and Pages

| Route | Purpose | Key sections | Primary action |
| --- | --- | --- | --- |
| / | Home: the steep clock | Drop hero; steep clock; Today at Carbon; signatures (no prices); three outlets; events teaser; proof (awards and press); book wall teaser; footer with hours and WhatsApp | Book a table |
| /menu | Full menu, about 160 items | Search; filters (drinks, food, caffeine-free, dietary tags); categories; list and periodic views; Paper theme; PDF download | Book a table |
| /cold-brew | The 18 to 96 hour story | Steep explorer, the seven brews, how it is made | See the menu |
| /outlets and /outlets/[slug] | One page per outlet | Photos, hours, map, what differs, today's status | Book here |
| /book and /book/[code] | Booking flow and manage-booking | Outlet, date and time, party size, details, review and pay choice; later change or cancel | Confirm |
| /events and /events/[slug] | Events and workshops | List, detail, tickets, waitlist | Get tickets |
| /checkout/[orderId] | Payment | Summary, pay online or at the café, gateway sheet | Pay |
| /enquire | Catering, collabs and launches | Short form with an enquiry type | Send enquiry |
| /my-carbon | Stamp card (optional) | OTP sign-in, card, QR, history | Show QR |
| /book-wall | Community shelf | Shelf, add form, spine detail | Add your book |
| /story | Brand, awards and press | Voice, timeline, awards, press | Visit |
| /legal/* | Privacy, terms, cancellation and refund | Plain-language pages | — |
| /admin/* and /staff | Back office and barista scanner | See section 10 | — |
| 404 and offline | Friendly states | Short copy, link back to menu and booking | Go home |

Awards to show on /story and the home page come from Carbon's own PDF: EazyDiner Foodie Awards (Best Cafe), Zomato Restaurant Awards 2025 (Top 10 in Coffee, Jaipur) and Travel + Leisure Delicious Dining 2025 (Best Cafe). Confirm wording with Carbon before publishing.

Table QR codes open /menu?src=qr&outlet=c-scheme (and the matching outlet slug) so scans can be counted per outlet.

## 5. Wireframes and Flows

These are low-fidelity screens in the Carbon palette. Prices of tickets and deposits are shown as “Rs ---” because they have not been given. Copy is draft. A clickable prototype of these flows comes next, before any API work.

### 5.1 Home

| Screen | What it does | States and edge cases |
| --- | --- | --- |
| 1 The drop | Hero. A drop falls, ripples reveal the headline. 00h counter at the bottom. | Reduced motion: still frame. Slow network: headline renders first, animation loads after. |
| 2 Steep clock | Pinned section. Scrolling moves the clock from 0 to 96h; each brew card appears at its steep time. The card shows name, notes and steep time only, no price. | Pin length shorter on phones. Landscape phones skip pinning. Keyboard users get a next/previous control. |
| 3 Come have one | Outlet cards with open-now status, then Book and Menu buttons. | Status computed from hours and special hours. Closed outlets show next opening time. |

### 5.2 Menu

| Screen | What it does | States and edge cases |
| --- | --- | --- |
| 1 Categories | Search, filters and the category list in the Paper theme, like the printed menu. A “Download the PDF menu” link sits under the list. | Empty search shows suggestions. Dietary tags come from admin. The structured menu is what people see first; the PDF is for saving and sharing. |
| 2 List | Items with notes, steep-time chip and price. | Unavailable items stay visible and greyed out with “not today”. |
| 3 Periodic | Signature items as element tiles. Tap for a bottom sheet with a Book button. | About 160 items will not fit as tiles; the periodic view covers signatures and always has a plain list alternative. |

### 5.3 Booking: small group instant, large group request

| Screen | What it does | States and edge cases |
| --- | --- | --- |
| 1 Outlet, date, time | Choose outlet, day and a time slot. Full slots are struck through; low availability is flagged. | No slots left: offer the next day and a waitlist. Same-day cutoff by lead time. |
| 2 Party size | Stepper. Within the limit, copy says confirmed instantly. Above it, the button becomes “Send request”. | Limit is a setting per outlet (placeholder 6). Very large groups point to the enquiry form. |
| 3 Details | Name, phone, notes, WhatsApp consent, privacy notice, invisible bot check. | Phone format check (+91). Duplicate submission returns the existing booking. |
| 4 Review and pay | Summary and a choice: pay at the café or pay online. A countdown shows how long the table is held. | Hold expires: release the table and say so kindly. Deposit amount and rules come from Carbon. |
| 5 Confirmed | Booking code, calendar, WhatsApp details, directions, change or cancel. | Works offline once loaded. Cancel respects the cutoff window. |
| 6 Group request | Form for large groups. Status becomes Requested; staff reply on WhatsApp. | No reply within the agreed time: reminder to staff and a nudge to the customer. |

### 5.4 Events and payments

| Screen | What it does | States and edge cases |
| --- | --- | --- |
| Events list and detail | Shows events and workshops; ticket quantity with a 10-minute seat hold. | Few left and sold-out badges. Sold out leads to the waitlist. |
| Waitlist | Phone number and WhatsApp consent; shows position in line. | When a seat opens, the first person gets a short claim window; then the next. |
| Checkout | Pay online now or pay at the café (seat held until a time set by Carbon). | Pay-at-café seats that are not paid by the deadline are released automatically. |
| Gateway sheet | A hosted payment sheet (Razorpay Checkout) with UPI, cards, netbanking and wallets. Shown here as a labelled placeholder, not a design of their screen. | Card details never touch our servers. |
| Ticket with QR | Signed QR, code, calendar, share. | Cached for offline use at the door. |
| Payment failed | Calm message, seat hold timer, try again, another method, or pay at the café. | If money was deducted anyway, the webhook confirms or an automatic refund runs. |
| Payment pending | UPI can take time. The page updates itself and a WhatsApp message follows. | Closing the page loses nothing; the webhook completes the order. |
| Cancel and refund | Shows the cancellation rule and refund amount to the original method. | Window and amounts set by Carbon. Timing depends on the bank. |

### 5.5 Stamp card (optional module)

| Screen | What it does | States and edge cases |
| --- | --- | --- |
| 1 Phone number | Phone field and a plain-language notice of what the number is used for, with consent. | Wrong format blocked; consent is required before the code is sent. |
| 2 OTP | Six boxes, resend timer, wrong-number link. | Limited attempts and resends; paste and autofill supported. |
| 3 Card | Stamps filled, reward preview, QR for the barista. | The QR changes every minute so a screenshot is useless. |

### 5.6 Book wall

| Screen | What it does | States and edge cases |
| --- | --- | --- |
| 1 Shelf | Spines on a shelf. Colour and height are generated from the title, so no cover images and no copyright issues. | Empty shelf shows a prompt; long titles are truncated on the spine and full on tap. |
| 2 Add a book | Title, author, one line, optional first name or handle. Staff approve before it appears. | Length limits, profanity filter, bot check, rate limit. |
| 3 Detail | Shows the line, how many readers shelved the same book, a report link. | Duplicate titles merge and increase the reader count. |

### 5.7 Admin and staff app

| Screen | What it does | States and edge cases |
| --- | --- | --- |
| Dashboard | Today's covers, requests to review, online payments, check-ins, bookings list, capacity by slot. | Outlet switcher; managers see only their outlet. |
| Menu editor | Edit name, price, steep hours, notes, tags and availability; draft, then publish. | Publishing refreshes the public pages immediately. |
| Scan | Barista scans the customer's QR or types the phone number. | Camera denied: fall back to typing. |
| Add stamp | Shows the customer's card and adds a stamp, with a warning for a very recent stamp. | Undo for a short time; every change is logged with staff name. |
| Redeem | Staff enter the outlet PIN to redeem a full card. | Logged; the reward cannot be redeemed twice. |

## 6. Responsive Plan

Approach: mobile first, fluid type and spacing, container queries for components, and a handful of breakpoints. Widths below are CSS pixels and approximate; check them on real devices or emulators.

| Band | Width | Reference devices | Layout rules |
| --- | --- | --- | --- |
| Compact phone | 320 to 389 | Small Android phones (360), iPhone SE (375), foldable cover screens (about 340 to 360) | One column. Body never below 16 px. Sticky bottom action bar. Decorative motion off. |
| Phone | 390 to 599 | iPhone 15 and 16 (393), Pro Max (430), most Android phones, one screen of a dual-screen device (about 540) | One column. Primary action in the thumb zone. Steep clock pins for a shorter distance. |
| Tablet and open fold | 600 to 1023 | iPad mini (744), iPad (820 to 834), foldable inner screens (about 600 to 720) | Two columns where useful. Booking shows the summary beside the form. |
| Laptop | 1024 to 1439 | iPad landscape, laptops at 1280 and 1366 | Three-column steep clock. Hover states appear only for fine pointers. |
| Large | 1440 to 1919 | MacBooks, laptops at 125 percent scaling | Wider gutters, larger display type. |
| Wide | 1920 and up | Full HD and QHD monitors | Content capped near 1440 px and centred; grid motif fills the gutters. |

### Foldables and dual-screen

- Jokes aside about an “iPhone Duo”, the same rules cover any foldable or dual-screen device: Surface Duo, Galaxy Z Fold and Flip, and anything similar.
- Use the CSS viewport-segments media features (for example horizontal-viewport-segments: 2) as a progressive enhancement. Browser support is limited, so the fallback matters more.
- Fallback: a two-column layout that never places an interactive element in a 40 px zone around the middle seam.
- Tall flip phones: avoid fixed heights; use small-viewport units so content survives the changing browser bars.
### Cross-device rules

- Touch targets at least 44 by 44 CSS px. Primary buttons at the bottom on phones.
- No hover-only features. Magnetic hover effects only under (hover: hover) and (pointer: fine).
- Respect safe-area insets for notches and the Dynamic Island. Use small-viewport units (svh) instead of 100vh.
- Text zoom to 200 percent and reflow at 320 px without horizontal scrolling.
- Landscape phones (short height): no full-height pinned sections.
- Respect prefers-reduced-motion, prefers-color-scheme and prefers-contrast.
### Test matrix

| Group | Devices and viewports |
| --- | --- |
| Phones | iPhone SE 375x667, iPhone 15 or 16 393x852, Pro Max 430x932, Galaxy S class 360x800, low-end Android 360x640 |
| Foldables | Galaxy Z Fold (cover and inner), Z Flip, Surface Duo emulator (single and spanned) |
| Tablets | iPad mini 744x1133, iPad Pro 11 834x1194, portrait and landscape |
| Laptops and desktops | 1366x768, about 1440x900, 1920x1080, 2560x1440 |
| Browsers | Safari on iOS, Chrome on Android, Samsung Internet (widely used in India), Chrome, Edge, Safari and Firefox on desktop |

## 7. Motion and Smoothness

### Animation catalogue

| Effect | Where | How it works | Tech and fallback |
| --- | --- | --- | --- |
| Drop and ripple | Home hero | A drop falls; rings expand from it and reveal the headline. About 1.2 s. | SVG and GSAP. Reduced motion: still frame. |
| Steep clock | Home, cold-brew page | Scroll scrubs a counter 0 to 96h, shifts background from amber to black, and reveals each brew at its steep time. | GSAP ScrollTrigger, pinned. Fallback: stacked cards, no pin. |
| Brew reveals | Steep clock | Cards rise in with faint steam lines. | Transform and opacity only. |
| Tile flip | Periodic menu | Tiles reshuffle when filters change. | View Transitions API where supported, else a fade. |
| Mark assembly | Page transitions | The four glyphs in Carbon's mark assemble in about 400 ms. | CSS and SVG; skipped for reduced motion. |
| Micro-interactions | Buttons, steppers, stamps | Press scale 0.98; stamp lands with a small bounce and, on Android, a short vibration. | CSS. Vibration only where supported. |
| Book wall | Wall page | Spines slide onto the shelf at slightly random angles, as if placed by hand. | Motion library; paused off-screen. |
| Easter egg | Anywhere | Typing 96 runs the clock to the end. | Tiny keyboard listener. |

### Smoothness rules

- Animate transform and opacity only. Never animate width, height, top or left.
- Native scrolling. No scroll hijacking: it harms accessibility and iOS momentum scrolling. GSAP is free for commercial use since Webflow's acquisition.
- Pause animations that are off-screen. Load the heavy scene after the headline is visible.
- Images in AVIF or WebP with blurred placeholders; the hero image gets high fetch priority.
- Skeleton screens for availability and menu data; optimistic updates for stamps with a quiet rollback.
- Target 60 frames per second and test on a mid-range Android phone, not only a new iPhone.
### Performance budget (targets)

| Metric | Target | Note |
| --- | --- | --- |
| Largest Contentful Paint | 2.5 s or less on mid-range Android over 4G | Google's “good” threshold |
| Interaction to Next Paint | 200 ms or less | Google's “good” threshold |
| Cumulative Layout Shift | 0.1 or less | Font fallback sizing and reserved image space |
| JavaScript on the home route | 170 KB gzipped or less | Loads the scene lazily |
| Hero image | 120 KB or less | AVIF or WebP |
| First view total | 1.5 MB or less | Fonts, images and scripts |

## 8. Architecture (HLD)

### How it fits together

- Three clients share one backend: the customer site, a staff scanner (a PWA on a phone or tablet) and the admin panel.
- An edge layer serves cached pages, applies rate limits and runs the bot check.
- One Next.js application holds the modules (menu, outlets, booking, events, payments, loyalty, book wall, enquiries, notifications). It is a modular monolith: one deployment, clear module boundaries, easy to split later.
- Postgres is the source of truth. Seat and table races need real transactions and row locks, which is why a relational database fits better than a document store.
- Scheduled jobs expire seat holds, send reminders and reconcile payments.
### Rendering strategy

| Content | Strategy | Why |
| --- | --- | --- |
| Menu, outlets, story, events list | Static with on-demand revalidation when admin saves | Fast, cheap and always fresh after an edit |
| Availability and ticket counts | Never cached for more than a few seconds; always re-checked on submit | Avoids showing slots that are gone |
| Booking, checkout, my-carbon | Dynamic, server-validated | Money and capacity must be checked on the server |
| Admin and staff | Dynamic, behind login | Role-based access |

### Technology choices

| Layer | Choice | Why | Alternative considered |
| --- | --- | --- | --- |
| Framework | Next.js (App Router) with TypeScript | Plays to your React, Next.js and TypeScript strength, so you can maintain it for Carbon | Astro (great for static, weaker for the app-like booking flow) |
| Styling | Tailwind CSS with CSS variables for tokens | Tokens map to the palette; small CSS output | CSS Modules |
| Animation | GSAP with ScrollTrigger; Motion for small UI effects | Best control of scroll scenes; both are free for commercial use | CSS scroll-driven animations (browser support still uneven) |
| Database | Postgres on Supabase | Transactions, row locks, row-level security, storage and staff auth in one product | Neon; Firebase (weaker for relational booking) |
| Data access | Drizzle or Prisma | Typed queries | Raw SQL for the booking-lock queries |
| Payments | Razorpay Standard Checkout, Orders API and webhooks | UPI, cards, netbanking and wallets in one hosted flow | Cashfree; PhonePe PG |
| OTP | SMS through a DLT-registered provider such as MSG91 | Indian rules require registered templates; low per-message cost | Twilio Verify; Firebase phone auth; WhatsApp OTP |
| WhatsApp | Version 1: click-to-chat links. Later: Business API through a provider | Zero setup first, automation when volume justifies it | SMS only |
| Email | Resend or Amazon SES | Receipts and tickets | Provider SMTP |
| Hosting | Vercel Pro | Best Next.js support. The free Hobby plan does not allow commercial use | Cloudflare Pages or Workers |
| Jobs | Supabase scheduled functions or Vercel Cron | Hold expiry, reminders, reconciliation | Dedicated queue (QStash) |
| Quality | Playwright, Vitest, Lighthouse CI, axe | Mobile viewports, performance and accessibility gates in CI | Manual testing only |
| Monitoring | Sentry, uptime monitor, privacy-friendly analytics | Know about failures before the owners do | Logs only |

Accounts for hosting, database, payments and messaging should be opened in Carbon's name with you as an admin, so handover is clean.

### Environments

- Local, Preview (one per pull request), Staging with payment test mode and a test phone number, Production. Secrets live in the host's encrypted settings, never in the repository.
## 9. Detailed Design (LLD)

### Data model

Money is stored as integers in paise, never as decimals. Times are stored in UTC and shown in Asia/Kolkata.

| Entity | Key fields | Notes |
| --- | --- | --- |
| outlets, outlet_hours | slug, name, address, geo, phone, timezone; weekday, open, close, overrides | Special hours for festivals |
| booking_settings | outlet_id, slot_minutes, dwell_minutes, capacity_per_slot, instant_max_party, min_lead_minutes, max_days_ahead | All numbers come from Carbon (open item 5) |
| bookings | code, outlet_id, starts_at, party_size, status, customer phone, note, hold_expires_at, source | Unique code like CRB-4821 |
| customers | phone (encrypted), phone hash for lookup, name, consent flags with version and time, deleted_at | Supports erasure |
| otp_challenges | phone hash, code hash, expires_at, attempts, ip | Never stores the code itself |
| stamp_ledger | customer_id, delta, reason, outlet_id, staff_id, idempotency_key, created_at | Append-only; balance is the sum |
| rewards | customer_id, issued_at, redeemed_at, staff_id | One redemption per reward |
| events, ticket_types | title, starts_at, outlet_id, capacity; name, price_paise, quota, sold | Quota guarded in SQL |
| orders, payments, refunds | kind, amount_paise, status, gateway order id, gateway payment id, method, raw payload | Orders expire if unpaid |
| tickets | order_id, ticket_type_id, code, signed token, checked_in_at | Check-in is once only |
| menu_categories, menu_items | name, notes, price_paise, steep_hours, tags, available, sort | steep_hours drives the clock |
| menu_documents | file, label, uploaded_at, uploaded_by | The downloadable PDF; admin warns if menu items changed after the last upload |
| enquiries | type, name, phone, details, status | Catering, collabs, launches |
| wall_entries | title, author, line, handle, status, moderated_by | Approve before publishing |
| waitlist | event_id, phone, position, claim_expires_at | First in line first |
| staff_users, audit_log | email, role, outlet_ids; actor, action, entity, diff, at | Every admin action is logged |
| webhook_events | provider, event id (unique), payload, processed_at | Makes webhooks idempotent |

### Booking rules

- Availability for a slot is capacity minus the party sizes of confirmed and held bookings that overlap it, using the dwell time.
- Instant if the party is within the limit and the slot has room. Otherwise the booking becomes a request.
- Creating a hold happens in one transaction that locks the slot, so two people cannot take the last table. The hold lasts 10 minutes (placeholder).
- Same phone and same slot within five minutes returns the existing booking instead of creating a duplicate.
- A change is a cancel and rebook inside one transaction.
| From | To | Trigger |
| --- | --- | --- |
| held | confirmed | Small group confirms |
| held | requested | Large group submits |
| held | expired | Hold timer runs out |
| requested | confirmed | Staff approve |
| requested | declined or expired | Staff decline, or no reply in the agreed time |
| confirmed | cancelled | Customer or staff cancel |
| confirmed | completed or no_show | Staff mark after the visit |

### Payment flow (Razorpay pattern)

| Step | What happens |
| --- | --- |
| 1 | Client asks to pay for an order (ticket, workshop seat or deposit). |
| 2 | Server checks stock or the hold and computes the amount itself. The client never sends a price. |
| 3 | Server creates an order row, then a gateway order (amount in paise, our order id as the receipt). |
| 4 | Client opens the hosted checkout with the gateway order id. |
| 5 | On success the client sends payment id, order id and signature. The server verifies the signature but does not finish the order. |
| 6 | The gateway webhook (payment captured or order paid) is the source of truth. Verify its signature, skip it if the event id was seen, then in one transaction mark paid, confirm stock and create tickets. |
| 7 | Send the ticket by WhatsApp and email. |
| 8 | A nightly job compares gateway payments with our orders and flags differences. |
| 9 | Refunds go through the gateway's refund API; the refund webhook updates our records. |

### OTP and stamp card rules (numbers are placeholders)

- OTP request: normalise the phone to +91 format, bot check, limit to 3 requests an hour per phone and 10 per IP, 30-second resend cooldown.
- Code: six digits, stored hashed, valid 5 minutes, at most 5 attempts. On success create or find the customer and start a session (secure, HTTP-only cookie, 30 days, sliding).
- Consent: record the notice version and the time with the phone number.
- Earning: the customer's QR holds a signed token valid for 60 seconds. A barista scans it; the server writes one ledger entry with an idempotency key and a minimum gap between stamps.
- Redeeming: when the balance reaches the reward threshold (8 in the wireframes), staff enter the outlet PIN. The ledger drops by the threshold and the reward is marked used.
- Fraud guards: registered staff devices, daily stamp caps per staff member with alerts, and a full audit log.
### Events, waitlist and tickets

- Ticket stock is decremented with one guarded statement (add to sold only if sold plus quantity is within the quota). No separate read-then-write.
- A seat hold lasts 10 minutes. Pay-at-café holds last until the time Carbon sets, then release automatically.
- Waitlist: when a seat opens, the next person is messaged and gets a short claim window; if they do not claim, the next person is offered it.
- Tickets carry a signed QR. The door scanner marks it used once and caches the ticket list so it still works with weak signal.
- If Carbon cancels an event, a job refunds every paid order and messages each customer.
### Book wall

- Submission goes through a bot check, rate limit, length limits and a profanity filter, then waits in a moderation queue.
- Spines are drawn from the title (colour and height from a hash), so there are no cover images to license.
- The same title merges into one spine with a reader count. Names are optional and shown as first name or handle only.
### Notifications

| Trigger | Channel | Meta category (WhatsApp) |
| --- | --- | --- |
| Booking or ticket confirmed | WhatsApp, with email as a copy | Utility |
| Reminder a few hours before | WhatsApp | Utility |
| Group request received, approved or declined | WhatsApp | Utility |
| OTP | SMS (WhatsApp later) | Authentication |
| Waitlist seat available | WhatsApp | Utility |
| Post-visit review request | WhatsApp, opt-in only | Likely Marketing; check the category and cost before enabling |

### API surface (planned, for the implementation phase)

| Endpoint | Purpose | Access |
| --- | --- | --- |
| GET /api/availability | Slots for outlet, date and party size | Public |
| POST /api/bookings | Create a held booking | Public with bot check |
| POST /api/bookings/:id/confirm and /cancel | Finish or cancel | Booking code token |
| POST /api/orders and /orders/:id/verify | Create an order; check the payment signature | Public |
| POST /api/webhooks/razorpay | Payment events | Gateway signature |
| POST /api/auth/otp/request and /verify | Stamp card sign-in | Public, rate-limited |
| GET /api/me, /me/stamps, /me/qr | Customer data and rotating QR | Customer session |
| POST /api/staff/stamps and /staff/redeem | Add stamp, redeem | Staff session and device |
| POST /api/events/:id/waitlist | Join waitlist | Public |
| POST /api/wall and /api/enquiries | Book wall and enquiry forms | Public with bot check |
| /api/admin/* | Back-office actions | Staff roles |

Every write endpoint accepts an idempotency key so a double tap or a retry cannot create two bookings or two payments.

## 10. Admin Panel

| Role | Can do |
| --- | --- |
| Owner | Everything, including users, payments, refunds and reports across outlets |
| Manager | Their outlet only: bookings, capacity and hours, menu availability, events, check-in |
| Barista | Scan and stamp, redeem with PIN, view today's bookings, check people in |
| Marketing | Events, book wall moderation, content and announcement banners, enquiries |

### Modules

- Dashboard: today's covers, requests to review, online payments, check-ins.
- Bookings: calendar and list, approve or decline, add notes, mark no-show, add walk-ins.
- Capacity and hours: slot rules, special hours, blackout dates, event nights.
- Menu: categories and items with price, steep hours, notes, tags, photo and an availability switch. Draft then publish. Upload the menu PDF for the download link; a warning shows if items changed after the last upload.
- Events: create events and ticket types, attendee list, check-in, export, waitlist.
- Payments: transactions, refunds, daily reconciliation view.
- Stamp card (optional): rules, customers, scan log, redemptions.
- Book wall: moderation queue, pin staff picks.
- Enquiries inbox: catering, collabs and launches with status.
- Content: announcement banner (for example, closed for a festival) and key copy.
- Reports: bookings by outlet, peak times, no-show rate, event sell-through, direct versus aggregator bookings if tracked.
- Users and audit log. Staff sign in with a magic link or Google; multi-factor is optional.
## 11. Edge Cases

### Booking

- Two people take the last table at once: the slot lock lets one succeed and offers the other the next best slots.
- Hold expires while someone is typing: say so, release the table and offer to re-check availability.
- Outlet closed for a festival or event night: blackout dates and the announcement banner.
- Booking made on Zomato or EazyDiner for the same table: aggregator bookings are entered manually by staff, so capacity stays honest. No live sync is assumed.
- Bots and spam: invisible bot check, rate limits, phone format check and an alert on unusual volume.
- Customer arrives late or never: no-show marking, and an optional deposit for large groups if Carbon wants one.
### Payments

- Money taken but the user closed the tab: the webhook completes the order.
- Double tap on Pay: idempotency keys and one order per hold.
- Price tampering: the server computes every amount.
- Payment succeeds after the hold expired: re-check capacity; if it is gone, refund automatically and tell the customer clearly.
- Webhook arrives twice or out of order: unique event ids and state checks.
- Gateway outage: show “pay at the café” as an alternative where Carbon allows it.
- Refunds after an event is cancelled: bulk refund job with a report of any failures.
### OTP and stamp card

- OTP delayed or not delivered: resend with a cooldown, a clear message, and later a WhatsApp fallback.
- Wrong or mistyped number: confirm before sending; a change-number flow.
- Shared phone: one number is one card; staff can look up by number.
- Screenshot of a QR shared with friends: QR tokens last 60 seconds.
- Barista double-scans: idempotency key and minimum gap between stamps, with undo.
- Customer wants their data deleted: a self-service deletion request.
### Events

- Sold out during checkout: the guarded stock update fails cleanly and offers the waitlist.
- Poor signal at the door: cached ticket list and an offline-tolerant scanner.
- Forwarded tickets: each QR works once; staff can look up by name or phone.
### Book wall and content

- Offensive or off-topic entries: approval queue and a report link.
- Very long titles, emoji or non-English text: truncation on the spine, full text on tap, fonts with wide coverage.
- Menu changes during service: availability switch hides or greys an item instantly; prices change only on publish.
- PDF and live menu disagree: the structured menu is the source of truth, the PDF shows its upload date, and admin warns when items change after the upload.
### Devices, network and accessibility

- Slow 4G or data saver: static pages, small images, scene loads after the headline.
- Old or low-end phones: animation can be turned off automatically when the device reports low memory or reduced motion.
- Screen readers: the steep clock exposes its value as text and provides next and previous buttons.
- Keyboard only: visible Amber focus rings; all steps usable without a mouse.
- Colour: status is never shown by colour alone (icon or text too).
## 12. Security and Privacy

### India's data protection law

- The Digital Personal Data Protection Act, 2023 and its Rules were notified in November 2025. Obligations phase in over about 18 months, with the main duties (clear notice, consent, security safeguards, breach reporting, deletion) expected from May 2027. Build them in from day one, because Carbon will be collecting phone numbers and names.
- Practical meaning: a standalone plain-language notice for each purpose (booking, stamp card, book wall), consent recorded with the notice version and time, collection of only what is needed, a way to delete data, and a breach response plan.
- Get a lawyer to review the privacy notice, terms and refund policy before launch. This document is not legal advice.
### Controls

| Area | Control |
| --- | --- |
| Transport and browser | HTTPS everywhere with HSTS, secure HTTP-only cookies, a content security policy, strict input validation |
| Payments | Hosted gateway checkout, so no card data touches our servers; webhook signatures verified; amounts computed on the server |
| Accounts | OTP codes stored hashed, limited attempts, staff sign-in by magic link or Google, optional multi-factor, least-privilege roles |
| Data | Phone numbers encrypted at rest with a hash for lookup; row-level security in the database; audit log of every admin action |
| Abuse | Bot check on every public form, rate limits per phone and per IP, alerts on unusual volume |
| Operations | Secrets in the host's encrypted settings, dependency scanning, error monitoring without personal data in logs, backups with a tested restore |

### Retention (to agree with Carbon)

- OTP records: delete within a day. Bookings and tickets: keep for an agreed period, then anonymise. Stamp card data: keep while the card is active, delete on request. Book wall: delete on request.
## 13. Scalability and Expansion

A café site is light on traffic. The hard parts are concurrency on the last table or ticket and idempotent payment webhooks, not raw volume.

### What scales and how

- Traffic spikes (a viral reel): static and cached pages absorb them at the edge.
- Database load: connection pooling, short transactions, indexes on slot and event lookups.
- Ticket drops: load-test the checkout before launch (for example with k6) to see where it breaks, and put a short queue message in front if needed.
- Notifications and jobs run outside the request path, so a slow WhatsApp or SMS provider never blocks a booking.
- Portability: Postgres and Next.js can move to other hosts, so vendor lock-in is limited.
### Growth path

| Stage | Capabilities | What it needs |
| --- | --- | --- |
| Pilot | Menu with PDF download, outlets, steep clock, enquiry form, WhatsApp booking links, table QR codes that open the menu | Design system, content, photos, printed QR stands |
| Growth | Booking engine, payments, events and tickets, admin core | Database, payment account, WhatsApp number, policies from Carbon |
| Full | Stamp card, book wall, reports, extended admin | DLT-registered SMS, moderation routine, privacy review |
| Later | Bottled cold brew shop; POS integration so stamps follow the bill; live batch tracker; Hindi; a fourth outlet or a new brand (a brand id on every record); an app wrapper; hours sync to the Google profile | Shipping, GST and licence checks for the shop; POS vendor API; translation; more admin roles |

### QR codes in the café: menu first, ordering later

Verdict: a good idea, but not as a first build. A QR that opens the menu is cheap and safe. A QR that takes orders is a separate product.

| Phase | What | Notes |
| --- | --- | --- |
| 1 (Pilot) | Table QR opens the live menu, with booking and a Google review link | Low risk. Counts scans per outlet through the source parameter |
| 2 | Find out Carbon's POS or billing system | Many Indian POS systems sell QR ordering as an add-on, so linking to it can cost far less than building |
| 3 (only if Carbon wants it) | Order-ahead for takeaway and bottled cold brew | Fits the “On the Go” side of the brand and avoids table complexity |
| 4 (only with POS integration) | Order from the table | Staff validation, kitchen tickets and billing must stay in one system |

### Why not build ordering first

- A live ordering outage during service costs Carbon sales and puts the support burden on you, at pilot prices.
- Orders that staff must retype into the till are worse than no ordering. Vendors of POS-integrated ordering say standalone tools often get replaced for this reason (a vendor's view, but the logic is sound).
- Fake orders: table-bound codes plus a staff validation step are needed so a photographed QR cannot create kitchen tickets.
- Allergies: every menu page asks guests to mention dietary restrictions, so any ordering flow must pass that note to the bar.
- The ordering layer depends on the internet. Test signal inside the outlets before promising anything.
- Brand fit: Carbon sells a mood and a human bar, so ordering by phone should be an option, not a replacement.
- Rough size if built from scratch: 120 to 200 extra hours plus ongoing support (my estimate, not researched).
## 14. Costing

Everything here is a planning estimate for a solo developer. It excludes photography, copywriting and legal review. Hours are firm enough to reason with; rupee figures depend on your rate and any discount you choose.

### Build hours by module

| Module | Pilot | Growth adds | Full adds |
| --- | --- | --- | --- |
| Discovery, audit and content direction | 16 to 24 | — | — |
| Design system and final wireframes | 24 to 36 | — | — |
| Home page with steep clock | 28 to 40 | — | — |
| Menu: Paper theme, filters, periodic view, PDF download | 26 to 38 | — | — |
| Outlets, story and legal pages | 16 to 24 | — | — |
| Enquiry form and WhatsApp links | 8 to 12 | — | — |
| Booking engine: slots, holds, requests, notifications | — | 44 to 64 | — |
| Payments: orders, webhooks, refunds, reconciliation | — | 28 to 40 | — |
| Events: tickets, waitlist, check-in | — | 32 to 48 | — |
| Admin core: dashboard, bookings, menu, events | — | 36 to 50 | — |
| Admin extended: reports, roles, audit views | — | — | 20 to 30 |
| Stamp card: OTP, ledger, QR, staff scanner | — | — | 32 to 48 |
| Book wall and moderation | — | — | 14 to 22 |
| QA, accessibility, performance, device testing | 12 to 16 | 12 to 16 | 4 to 8 |
| Deployment, monitoring, documentation, handover | 6 to 8 | 4 to 6 | 4 to 8 |
| Total hours | 136 to 198 | 156 to 224 | 74 to 116 |

### Three tiers

| Tier | Includes | Total hours | At Rs 500/h | At Rs 800/h | At Rs 1,200/h |
| --- | --- | --- | --- | --- | --- |
| Pilot | Menu, steep clock, outlets, enquiry, WhatsApp links | 136 to 198 | Rs 68,000 to Rs 99,000 | Rs 1,08,800 to Rs 1,58,400 | Rs 1,63,200 to Rs 2,37,600 |
| Growth | Pilot plus booking, payments, events, admin core | 292 to 422 | Rs 1,46,000 to Rs 2,11,000 | Rs 2,33,600 to Rs 3,37,600 | Rs 3,50,400 to Rs 5,06,400 |
| Full | Growth plus stamp card, book wall, extended admin | 366 to 538 | Rs 1,83,000 to Rs 2,69,000 | Rs 2,92,800 to Rs 4,30,400 | Rs 4,39,200 to Rs 6,45,600 |

The three hourly rates are illustrations only; substitute your own. You said you want to pitch for a minimal amount: the Pilot is the natural offer, and since it doubles as your case study, any discount is a decision for you to make. Keep the hours honest even when the price is reduced.

### Monthly running costs (vendor prices researched in October 2026)

| Item | Cost | Notes |
| --- | --- | --- |
| Hosting: Vercel Pro | $20 per user per month, includes $20 of usage credit | The free Hobby plan is not allowed for commercial use |
| Database: Supabase Pro | $25 per month plus usage | Includes 8 GB database and 100 GB file storage. The free plan pauses after 7 days of inactivity, so it is unsuitable for production |
| Baseline | About $45 per month before usage | Hosting plus database |
| Payments: Razorpay | 2% plus 18% GST on that fee (about 2.36%) per successful payment | No setup or annual fee. About Rs 236 on Rs 10,000 of online sales. Check for any current promotional waiver |
| SMS OTP (stamp card) | Roughly Rs 0.15 to 0.20 per SMS at base India rates; providers quote Rs 0.10 to 0.45 | DLT registration is required in India. Resends add cost |
| WhatsApp templates | About Rs 0.115 per delivered utility or authentication message; marketing about Rs 0.86 since January 2026 | Volume tiers lower the utility rate. Provider fees are extra (one provider lists Rs 500 per month per number). About Rs 230 for 2,000 confirmations and reminders before provider fees |
| Email, error monitoring, uptime | Free tiers usually cover low volume | Not researched in detail; check at signup |
| Domain | Not researched | Check a registrar |

Rates change. Meta has revised India's WhatsApp rates more than once in 2026, so confirm current numbers when you quote.

### Ongoing support (optional retainer)

Typical scope: monitoring and updates, small content and menu changes, security patches, and a monthly check of speed and uptime. Decide the hours and price with Carbon; this document does not assume them.

## 15. Case-Study Kit

### Story outline

- 1 Context: a loved brand whose booking, ordering and discovery run on other companies' platforms.
- 2 Audit: the numbers (ratings across Google, Zomato and Swiggy; follower count; conflicting listings; the cold brew search position).
- 3 Insight: the menu prints a steep time for every cold brew, which no channel was showing.
- 4 Concept: the site is a cold brew; scroll steeps it.
- 5 Design system: palette sampled from their own menu, two fonts and the reasons.
- 6 Flows and wireframes: booking with instant and request paths, payment, events.
- 7 Architecture and trade-offs: modular monolith, Postgres locks, webhook idempotency.
- 8 Edge cases solved: the last table, the double payment, the closed tab.
- 9 Results: performance, accessibility, and (after launch) direct bookings.
- 10 What I would do next.
### What to capture while you build

- Before and after screenshots of the audit; Lighthouse and accessibility reports; the architecture and data-model diagrams; a 30-second screen recording of the steep clock; the wireframes and prototype.
### Metrics to measure after launch

- Page speed (LCP, INP, CLS); share of bookings that come direct versus through aggregators; WhatsApp clicks; booking completion rate and time to book; event sell-through; no-show rate; stamp-card sign-ups and redemptions.
Publish a case study only with Carbon's permission, and agree which numbers may be shown.

## 16. Next Steps

| # | Step | Output |
| --- | --- | --- |
| 1 | Answer the open items in section 1, including which POS Carbon uses | Rules and numbers replace the placeholders |
| 2 | Clickable prototype of the booking, payment and events flows with dummy data | A link you can tap through on a phone, before any API work |
| 3 | Design tokens and a type specimen | Colours, fonts and spacing as a small style page |
| 4 | Photography and copy list | Shot list for each outlet and the steep clock; draft copy for review |
| 5 | Pitch the Pilot to the founders | A working demo link plus this plan's summary |
| 6 | After a yes: implement the API | Booking, payments, events, then the stamp card |
