# Open questions

Placeholders (P-xx) match the ids in `src/config/placeholders.ts`. Change the value there, set it confirmed, and close the row here.

## Placeholders in use

| Id   | What                                    | Placeholder                                   | Source of the gap                                  |
| ---- | --------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| P-01 | Largest party that confirms instantly   | 6, per outlet                                 | Brief, Blueprint open item 1                       |
| P-02 | Table and seat hold length              | 10 minutes                                    | Brief                                              |
| P-03 | Event ticket prices                     | "Rs ---"                                      | Brief                                              |
| P-04 | Online table deposit                    | "Rs ---"                                      | Brief                                              |
| P-05 | Change and cancellation window          | "X hours" (demo logic: 2 h)                   | Brief, Blueprint open item 4                       |
| P-06 | Stamps for a reward                     | 8                                             | Brief, Blueprint open item 3                       |
| P-07 | Large-group reply time                  | "X hours"                                     | Brief, Blueprint open item 10                      |
| P-08 | Opening hours, all outlets              | 09:00 to 23:45                                | Listings conflict (23:45, 23:59, midnight)         |
| P-09 | Vaishali Nagar address                  | TBD                                           | B-42 Prince Road vs Plot 42, Yojna-9 B, Bhan Nagar |
| P-10 | Raja Park / Tilak Nagar building number | Shanti Path, number TBD                       | Brief                                              |
| P-11 | WhatsApp number                         | fictional +91 0000000000                      | Not given                                          |
| P-12 | Slot length                             | 30 minutes                                    | Blueprint open item 5 (my placeholder)             |
| P-13 | Table dwell time                        | 90 minutes                                    | Blueprint open item 5 (my placeholder)             |
| P-14 | Capacity per slot per outlet            | 24 seats                                      | Blueprint open item 5 (my placeholder)             |
| P-15 | Same-day lead time                      | 60 minutes                                    | Blueprint data model (my placeholder)              |
| P-16 | How far ahead you can book              | 30 days                                       | Blueprint data model (my placeholder)              |
| P-17 | Minimum gap between stamps              | 30 minutes                                    | Blueprint section 9 (my placeholder)               |
| P-18 | Privacy notice version                  | "draft-0"                                     | Legal text not written                             |
| P-19 | One line per outlet about the room      | not shown; marked TBC                         | Pitch plan: ask the staff, do not invent           |
| P-20 | Press article links                     | "Link to come"                                | Brief: titles only, placeholder links              |
| P-21 | Largest party the booking form takes    | 20; bigger groups go to the enquiry form      | Blueprint 5.3 (my placeholder)                     |
| P-22 | Pay-at-cafe deadline for event seats    | "a time Carbon sets" (demo logic: 2 h before) | Blueprint 5.4                                      |
| P-23 | Waitlist claim window                   | 30 minutes                                    | Blueprint 5.4 (my placeholder)                     |
| P-24 | Tickets per order                       | 6                                             | My placeholder                                     |

## Questions for you (Tarul)

| #    | Question                                                                          | Default I will use unless you say otherwise | Needed by                          |
| ---- | --------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------- |
| Q-20 | Prices for each event, and whether each sells online, at the cafe, or both        | "Rs ---"; both offered                      | Before launch                      |
| Q-21 | Age rules for Coffee Raves (Blueprint open item 9)                                | Not shown                                   | Before launch                      |
| Q-22 | The real event calendar: names, dates, capacity, posters                          | Three labelled samples                      | Before the pitch, if you have them |
| Q-23 | Can tickets be passed to a friend? The demo shares the event link, not the ticket | Event link only                             | M5                                 |

## Answered

| #    | Answer (date)                                                                      | Applied                                                                                              |
| ---- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Q-01 | Logo was taken online; it stays a placeholder and changes after a yes (2026-10-10) | SVG redraw of the mark, Jost wordmark                                                                |
| Q-04 | Keep the short slugs (2026-10-10)                                                  | `c-scheme`, `raja-park`, `vaishali-nagar`                                                            |
| Q-05 | Derived symbols are fine (2026-10-10)                                              | First letters of the menu name, unique, see `elementSymbols`                                         |
| Q-06 | Serve the full PDF; admin can upload a newer one later (2026-10-10)                | `/menu/carbon-menu-march-2026.pdf`, upload in M7                                                     |
| Q-09 | Derived Paper accents are fine (2026-10-10)                                        | D-006                                                                                                |
| Q-10 | Find the signatures across all menu pages, exact menu names (2026-10-10)           | Four drinks carry the Carbon name: Black Carbon Latte, Carbon Ginger Brew, Carbon Toddy, Pink Carbon |
| Q-11 | OK to reuse "Coffee stronger than your ex." (2026-10-10)                           | Footer and /story heading                                                                            |
| Q-12 | OK to name the BMW Motorrad launch (2026-10-10)                                    | Events teaser and /story timeline                                                                    |
| Q-02 | Defaults accepted (2026-10-10)                                                     | LocalBusiness schema only; the rest logged as "later"                                                |
| Q-03 | Defaults accepted (2026-10-10)                                                     | Brief's six; the large-group request replaces step 5's pay choice                                    |
| Q-07 | Defaults accepted (2026-10-10)                                                     | Labelled "sample" with future dates, "Rs ---" prices                                                 |
| Q-08 | Defaults accepted (2026-10-10)                                                     | Obviously fake names and +91 90000 000xx numbers                                                     |
| Q-13 | Defaults accepted (2026-10-10)                                                     | Added with the events module in M4                                                                   |
| Q-14 | Defaults accepted (2026-10-10)                                                     | Show the menu's section name as printed; make no caffeine-free claim or filter                       |
| Q-15 | Defaults accepted (2026-10-10)                                                     | One menu for all three outlets                                                                       |
| Q-16 | Defaults accepted (2026-10-10)                                                     | Last slot = closing minus table time                                                                 |
| Q-17 | Defaults accepted (2026-10-10)                                                     | No; staff check capacity when approving (M7)                                                         |
| Q-18 | Defaults accepted (2026-10-10)                                                     | Not online; they reply on WhatsApp                                                                   |
| Q-19 | Defaults accepted (2026-10-10)                                                     | "Nothing left, try the next day"; no table waitlist                                                  |

## Conflicts between the docs (brief wins)

| Topic                          | Brief                         | Other doc                                                           | Resolution                                     |
| ------------------------------ | ----------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| Motion library                 | GSAP + Motion                 | Pitch plan: Framer Motion or GSAP                                   | Brief                                          |
| Back office                    | Mock admin with role switcher | Pitch plan: admin or Sanity; Blueprint: magic link / Google sign-in | Brief for Phase 1                              |
| Ordering                       | No ordering                   | Pitch plan: WhatsApp ordering                                       | Brief                                          |
| Hero                           | Drop hero, headline           | Pitch plan: ripple reveals the logo                                 | Headline until Q-01 is answered                |
| Travel + Leisure award wording | "Best Cafe"                   | Pitch plan adds "(standalone restaurants and bars)"                 | Brief wording; confirm with Carbon             |
| Vaishali Nagar                 | Address TBD                   | Pitch plan: highlight it as newest                                  | Not highlighted until the address is confirmed |
| Leaf colour                    | Open now, success             | Blueprint: also the vegetarian dot                                  | No vegetarian claim until you confirm (brief)  |

## Facts to confirm with Carbon before publishing

- Food menu is fully vegetarian; no alcoholic drinks (brief: confirm before stating).
- Award wording on /story and home.
- Hours (P-08) and both unconfirmed addresses.
- Menu transcription (M2): three spelling slips in the PDF were corrected on the site: "cococnut" (Coconut Matcha Cream), "rasoberry" (Raspberry Iced Latte), "oinch" (Caramel Sea Salt Latte). Everything else is as printed, including "whisky barrel" in the Tiramisu Latte.
- Page 20 of the PDF has an empty top half. Nothing appears to be missing, but worth asking whether a section (desserts?) was meant to be there.
- Carbon's own award captions (PDF page 10) read "Eazydiner Foodie Awards, The Best Cafe" and "Travel + Leisure, Standalone Restaurant & Bars, Best Cafe". The site uses the brief's shorter wording until Carbon confirms.
