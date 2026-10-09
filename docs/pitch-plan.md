# CARBON CAFÉ JAIPUR

> Converted from `originals/Carbon_Pitch_Website_Plan.docx` on 2026-10-09. Figures are in `docs/wireframes/`. If this file and the .docx disagree, the .docx wins.

Pitch Website Plan: “Brewed Slowly”

A creative website concept and outreach plan for pitching web services to Carbon.

## The Core Idea

Carbon's most distinctive product is time: cold brews steeped for 18 to 96 hours. Most café sites show a menu and a map. This site should make the visitor feel that slowness.

The site is a cold brew. As you scroll, it steeps.

- The page opens fully black with one coffee drop falling in the middle. The ripple reveals the logo.
- A small counter in the corner runs 0h to 96h as you scroll, and the background goes from translucent amber to deep black.
- The counter stops at real checkpoints from their own menu, and each cold brew appears at its printed steep time:
- 18h: Whiskey Barrel (apple and bourbon notes)
- 24h: Mango Passion
- 28h: The Original and Tropical Monk
- 36h: Mint Lime
- 96h: Vanilla Orange and Berry Bold
- At the end the counter stops and the site says: “Okay. Come have one.” Then it shows the nearest outlet and today's open hours.
This uses their strongest USP, the dark industrial identity, as the interface itself, and no template site does this.

## Features That Each Show a USP

### 1. The Periodic Table menu

Carbon is element C, number 6. Present menu items as element tiles, like Cb for Cold Brew or Bl for Black Carbon Latte. Make it filterable by coffee, matcha, food and dessert. It's playful and instantly on-brand.

### 2. “Pick your Carbon” in 3 questions

Mood, time of day and sweet or strong lead to a drink. Rule-based logic is enough, no AI needed. The result is a shareable dark card for Instagram stories, which gives them free marketing.

### 3. The digital book wall

Their physical space has a book wall. Visitors submit what they're reading, and the site shows a growing shelf. It builds community and gives people a reason to return.

### 4. Three outlets, three personalities

Each outlet gets its own card with photos, hours, a Maps link and a one-line vibe. Ask the staff for those lines instead of inventing them. The Vaishali Nagar outlet is the newest, so highlight it.

### 5. Events page

They have already run a “Kitchen Rave.” Give them an events page with RSVP and a WhatsApp confirmation.

### 6. Digital stamp card

A QR-based loyalty card where the barista scans and the customer collects stamps. It needs no app, and it is the feature that makes a café owner see revenue, not just design.

## Where Your Fullstack Skills Show

- Next.js and TypeScript for the frontend, with Framer Motion or GSAP for the scroll-brew animation.
- Supabase or Postgres for RSVPs, stamp cards and book submissions.
- A simple admin panel (or Sanity) so staff can change the menu, prices and events without calling you. This is what justifies a monthly retainer.
- WhatsApp links everywhere for booking, events and enquiries, since that is how most Jaipur customers will actually reach them.
- Local SEO: LocalBusiness schema, fast mobile load, and per-outlet pages so they rank for “cafe in C Scheme” and “cafe in Vaishali Nagar.”
## Making It Feel Human, Not AI-Generated

- Shoot your own photos. Visit the cafés, buy a coffee, and take real shots. This is the single biggest difference.
- Write in Carbon's voice. Short, dry and confident. Avoid “Welcome to our cozy café.” Try lines like “No jargon. Just coffee.”
- Skip the AI-site look: purple gradients, glassmorphism cards, stock imagery and generic hero text.
- Add small imperfections: a hand-drawn drip, a typewriter-style counter, or a hidden easter egg (type “96” anywhere for a surprise).
- Sound design is optional, but a soft drip sound on a mute toggle can be memorable.
## Plan

| Phase | What you do |
| --- | --- |
| Week 0: Audit | Check whether they have a site. Audit their Instagram link-in-bio, Google listing, mobile speed and Zomato/Swiggy presence. Find the gap you're fixing. |
| Week 1: Design | Moodboard, palette (black, charcoal, one warm accent), typography, and the scroll-brew storyboard. |
| Week 2: Build the demo | Hero scroll-brew, periodic table menu, outlet cards. A polished single-page demo, not the full product. |
| Week 3: Outreach | Deploy on Vercel at a name like carbon-concept.vercel.app. Record a 60-second screen video. Send it. |
| After a yes | Add the admin panel, stamp card, events, book wall and SEO. |

## Audit: Carbon's Current Digital Presence

Headline: Carbon's brand is stronger than the digital presence it owns.

The brand is well rated and has a sharp voice, but discovery, booking and ordering all run through other companies' platforms. Note that Carbon does have a link-in-bio page, but no website of its own.

### What's working (respect this in the pitch)

| Channel | What the audit found |
| --- | --- |
| Google | 4.3 stars, 636 reviews. Reservations only through Zomato, Swiggy, EazyDiner and District. |
| Zomato / District | 4.1 stars, 1,306 dining and 1,027 delivery ratings. Ambience 4.0, Food 4.0, Service 4.1. |
| Swiggy (Raja Park) | 4.6 stars, but only 66 ratings. |
| Instagram | 420 posts, 4,638 followers, following 6. Strong witty voice and tidy highlights (Cold Brew, Mixology, Coffee Rave, In the News). |
| Link-in-bio page | link.truelabs.co/carbon: a template page with gallery, menu, reviews feed and outlet locations, but generic copy and no brand story. |

Customers praise the ambience, drinks, Vietnamese drip and cold brew. This is a liked, real brand, so you are not pitching to a struggling café.

### Gaps

- Their “website” is a template. The copy (“Specialty Coffee, Expertly Brewed”, “Thousands of Happy Coffee Lovers”) is the opposite of the witty Instagram voice. It has no brand story, no cold brew story and no outlet pages, and it is built on a third-party tool.
- Everything is rented. Google's reserve button lists Zomato, Swiggy, EazyDiner and District, and the link-in-bio page sends people to the same platforms. There is no direct booking. Aggregators generally take a cut and own the customer relationship, which is where a stamp card, direct booking and WhatsApp ordering pay for themselves.
- The cold brew USP ranks low in local search. On the “cold brew jaipur” Google Places search, Carbon does appear, but near the bottom of the list (see Round 3). Their Instagram bio says “you cannot miss our cold brews,” yet the 18 to 96-hour story appears nowhere on their own channels. An AI search summary also missed the steeping times and the three outlets. A dedicated cold brew page with local SEO and schema markup gives Google something to rank.
- Facts differ across platforms. See the table below.
| Detail | What the platforms say |
| --- | --- |
| Hours | 9 AM to 11:45 PM on Google, Zomato and District. Instagram says “9am till midnight.” Swiggy Raja Park says 11:59 PM. |
| Price for two | ₹1,000 (Zomato), ₹800 (Swiggy Raja Park), ₹200-1,000 (Google). |
| Alcohol | Zomato lists “Alcoholic Beverages” among its categories. The March 2026 menu shows mocktails only and no alcoholic drinks, so the Zomato category looks wrong. Confirm with the founders. |
| Veg or non-veg | EazyDiner calls the C Scheme outlet veg and non-veg, while Raja Park and Vaishali Nagar are listed as pure vegetarian. Every dish on the March 2026 menu is vegetarian, so the C Scheme listing looks wrong. |

- Instagram reach looks modest for the footprint. 4,638 followers for three outlets, 420 posts and trade-press coverage. This is a judgment, not a benchmark, so use it carefully.
- Ambience isn't scoring above the rest. The dark interior is the brand's main identity, yet Zomato rates ambience at 4.0, level with food. The site can show the space properly.
### One thing that changes the concept

Zomato reviewers rave about food as much as coffee: Golden Garlic Maggi, Mushroom Burrito, Parmesan Truffle Fries and chilli cheese toast. Review tags read “Elaborate Menu.” So the periodic-table menu should cover food and drinks equally, not just coffee.

### Suggested pitch angle

“Carbon has a brand people love and a voice most cafés would kill for. But Zomato, Swiggy and Google own the booking, and your own link page sounds nothing like you. I built a demo to show what a Carbon-owned home could look like.”

Don't criticise the link-in-bio page directly. Position the site as the next step, not a fix for a mistake.

### Audit Round 3: Search, Portfolio PDF and Locations

### Correction: Carbon does appear for “cold brew jaipur”

The Google Places search shows Carbon, but around 19th of the 20 listings visible in the screenshots. The screenshots may skip a few entries between them, and results vary by searcher location, device and personalisation, so treat this as a snapshot, not a fixed ranking.

- Rating: Carbon's Google rating (4.3) is the lowest of the 20 visible listings; the rest sit between 4.4 and 5.0. Its review count (about 637) is on the higher side, so this is a real signal, not a small-sample fluke.
- Relevance: A reviewer credits Carbon with the best cold brew, so the profile already earns cold-brew relevance. Jacobs Brew House, meanwhile, gets a “Menu highlight: cold brew” tag in its result and Carbon does not.
- What the site can and cannot do: It can supply a cold brew page, a full menu and structured data, and a QR or link that invites every customer to leave a Google review. It cannot guarantee a ranking, and ratings reflect the actual visit. Never filter who is asked for a review, since that breaks Google's rules.
### The PDF is the full March 2026 menu plus brand pages

The 24-page PDF linked from the link-in-bio page combines the full March 2026 menu with brand pages. (My earlier note calling it a portfolio only, and saying no menu was available, was wrong: I had only seen 8 of its 24 pages.) The brand pages show that Carbon runs more revenue lines than a café, and that most of them live in a PDF that is hard to search, update or book from.

| What the PDF shows | Evidence |
| --- | --- |
| Brand collaborations | A BMW Motorrad launch hosted at Carbon on 21 June 2025. |
| Coffee Raves | Packed events with a DJ; also an Instagram highlight. |
| Workshops | “Drip It Up” coffee brewing sessions. |
| Outdoor catering and pop-ups | Branded Carbon stalls at outdoor events, with a menu board. |
| Bottled cold brew | Branded bottles, including Whiskey Barrel, appear in the photos. |
| Awards | EazyDiner Foodie Awards (Best Cafe), Zomato Restaurant Awards 2025 (Top 10 in Coffee, Jaipur), Travel + Leisure Delicious Dining 2025 (Best Cafe, standalone restaurants and bars). |
| Press | Features in Curly Tales, Hospemag and Restaurant India. |
| Expansion | “Carbon 2.0” build at Tilak Nagar, 2026. |

The awards and press are Carbon's strongest proof points, yet the link-in-bio copy uses generic claims instead. The press voice is also worth borrowing: the founders pitch great coffee without a lecture, with a dark, bold, slightly rebellious tone. The site copy should sound like that.

### What the menu tells us

- Cold brew steep times are printed per drink. The 18 to 96-hour claim is real data: seven signature brews at ₹290 to ₹320, each with its own steep time. This is the content for the scroll-brew hero.
- Size: roughly 160 items in about 25 sections, around 100 drinks and 60 food items. A periodic-table layout works for signature items, but it needs filters and a plain list view for everything else.
- Price range: coffee mostly ₹150 to ₹350, cold brews ₹290 to ₹320, food from ₹170 to ₹590 (pizzas ₹490 to ₹590). This fits the ₹800 to ₹1,000 for two on the listings.
- No alcohol and no meat. The menu lists mocktails only, and every food item is vegetarian.
- Dietary note on every page. Each page ends with “Please mention your dietary restrictions,” so dietary tags on the site would be a real service.
### Locations: possible duplicate Google listing

An AI-generated location summary (treat as unverified) lists four Google entries: C Scheme (4.3, about 637 reviews), Raja Park / Jawahar Nagar (4.7, about 135), Vidyut Nagar on Prince Road (4.4, about 18), and a Vaishali Nagar entry at a different address (Plot 42, Yojna-9 B, Bhan Nagar, Khatipura).

Press says there are three outlets, and EazyDiner earlier gave the Vaishali Nagar outlet the B-42 Prince Road address. So the third outlet may have two Google listings, which splits reviews and confuses customers. Verify on Google Maps before raising it.

On timing: the Restaurant India article on the third outlet is dated 6 August 2026 and gives no opening date. The AI summary's 24 June 2026 date is unconfirmed.

The newer Raja Park outlet rates higher (4.7 on Google, 4.6 on Swiggy) than the flagship (4.3 on Google, 4.1 on Zomato), but on much smaller samples. Don't use this in the pitch; it may help decide which outlet to feature first.

### Still to check

- That each outlet's menu matches this March 2026 PDF. Prices and items may differ by outlet.
- Google Maps: confirm whether the third outlet has duplicate listings, and review the Raja Park and Vaishali Nagar profiles.
- Whether bottled cold brew is sold to customers, in the café or online, before proposing any shop feature.
- The last six Instagram reels, for voice and best-performing content.
## How the Website Fixes These Gaps

A website fixes some gaps directly, helps with others indirectly, and cannot fix a few at all. Being honest about that makes the pitch more credible.

| Gap | How the website helps | How much it fixes |
| --- | --- | --- |
| Template “website”, generic copy | Replaces it with a site in Carbon's own voice, with the brand story and outlet pages. | Fully. This is what you are delivering. |
| Everything is rented (Zomato, Swiggy, etc.) | Direct booking and WhatsApp ordering on their own site, plus a stamp card that brings customers back without a platform. | Partly. Aggregators won't disappear. It only works if promoted: QR codes on tables, Instagram bio, Google profile link. |
| Cold brew ranks low in search | A dedicated cold brew page with the 18 to 96-hour story, a full menu, proper page titles and local SEO markup. | Gives them a chance. Rankings take weeks to months and can't be guaranteed. |
| Lowest Google rating in the cold brew results (4.3) | A QR or link on tables and receipts inviting every customer to review on Google. | Partly. Ratings reflect the visit; this raises the volume of fresh reviews. |
| Menu exists only as a 24-page PDF | A live, filterable menu with each cold brew's steep time, dietary notes and prices staff can edit themselves. | Fully for the web. The printed in-café menu stays separate. |
| Events, workshops, catering and bottled cold brew exist only in a PDF | Enquiry and booking pages for each, with the awards and press shown as proof. | Mostly. It gives a way to enquire and book; demand is theirs to generate. |
| Facts differ across platforms | The site becomes the single source of truth for hours, prices and menu. | Only if the listings are also updated, so include a one-time cleanup of Google, Zomato, Swiggy and EazyDiner. |
| Instagram reach looks modest | Shareable features like the “Pick your Carbon” card and event pages give people something to post and tag. | Indirectly. A site doesn't create followers. |
| Ambience rated no higher than food | Proper photography and layout of the space, not just a few aggregator photos. | Modestly. Ratings come from the actual visit. |

### Why a café owner would pay

Owners don't buy websites; they buy outcomes. Frame it this way:

- Fewer middlemen: every booking or repeat visit that comes direct is one the platform doesn't take a cut from.
- More repeat visits: the stamp card is a measurable revenue feature.
- Capturing search demand: people searching for cold brew or cafés in C Scheme land on Carbon, not only on listing sites.
- Selling out events: Coffee Rave-style events get a proper RSVP page instead of DMs.
- Brand and corporate enquiries: launches like the BMW Motorrad one, catering and workshops get an enquiry form instead of a PDF.
- One place that's always right: hours, menu and prices without updating three platforms.
### What not to promise

- A specific number of new customers or a ranking position.
- That aggregator dependence ends.
- Instagram growth.
Promise the system and offer to measure it.

### Make it easy to say yes

Propose a 60-day pilot with metrics agreed upfront: WhatsApp clicks, direct bookings, stamp-card sign-ups and visits to the cold brew page. If it works, continue with the retainer. If not, they have lost little. That reduces their risk and shows confidence.

## How to Pitch

- Send a working demo, not a deck. A live link with their own branding is far more convincing.
- Lead with a problem, not your services: “I noticed X, so I built this to show what's possible.”
- Reach the founders directly. Sankalp Jain and Ujjwal Gupta are named in the press coverage. Try Instagram DM, LinkedIn or the café's email, and keep the message to 3-4 lines plus the link.
- Keep the entry price low and the upsell clear. For example, a fixed fee for the site and menu, then an optional monthly retainer for maintenance, events and the stamp card. As a rough ballpark, small-business sites in India often start in the ₹15,000-30,000 range with ₹2,000-5,000 a month for upkeep, but check what your market actually pays before quoting.
- Offer a pilot: “Let me do just the Vaishali Nagar page first.” It's a small yes that can grow.
