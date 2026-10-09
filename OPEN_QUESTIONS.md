# Open questions

Placeholders (P-xx) match the ids in `src/config/placeholders.ts`. Change the value there, set it confirmed, and close the row here.

## Placeholders in use

| Id   | What                                    | Placeholder              | Source of the gap                                  |
| ---- | --------------------------------------- | ------------------------ | -------------------------------------------------- |
| P-01 | Largest party that confirms instantly   | 6, per outlet            | Brief, Blueprint open item 1                       |
| P-02 | Table and seat hold length              | 10 minutes               | Brief                                              |
| P-03 | Event ticket prices                     | "Rs ---"                 | Brief                                              |
| P-04 | Online table deposit                    | "Rs ---"                 | Brief                                              |
| P-05 | Cancellation window                     | "X hours"                | Brief, Blueprint open item 4                       |
| P-06 | Stamps for a reward                     | 8                        | Brief, Blueprint open item 3                       |
| P-07 | Large-group reply time                  | "X hours"                | Brief, Blueprint open item 10                      |
| P-08 | Opening hours, all outlets              | 09:00 to 23:45           | Listings conflict (23:45, 23:59, midnight)         |
| P-09 | Vaishali Nagar address                  | TBD                      | B-42 Prince Road vs Plot 42, Yojna-9 B, Bhan Nagar |
| P-10 | Raja Park / Tilak Nagar building number | Shanti Path, number TBD  | Brief                                              |
| P-11 | WhatsApp number                         | fictional +91 0000000000 | Not given                                          |
| P-12 | Slot length                             | 30 minutes               | Blueprint open item 5 (my placeholder)             |
| P-13 | Table dwell time                        | 90 minutes               | Blueprint open item 5 (my placeholder)             |
| P-14 | Capacity per slot per outlet            | 24 seats                 | Blueprint open item 5 (my placeholder)             |
| P-15 | Same-day lead time                      | 60 minutes               | Blueprint data model (my placeholder)              |
| P-16 | How far ahead you can book              | 30 days                  | Blueprint data model (my placeholder)              |
| P-17 | Minimum gap between stamps              | 30 minutes               | Blueprint section 9 (my placeholder)               |
| P-18 | Privacy notice version                  | "draft-0"                | Legal text not written                             |

## Questions for you (Tarul)

| #    | Question                                                                                                                                                     | Default I will use unless you say otherwise                                          | Needed by |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ | --------- |
| Q-01 | Logo files?                                                                                                                                                  | Plain Jost wordmark "CARBON"; four-glyph page transition skipped until assets arrive | M1        |
| Q-02 | Pitch-plan extras not in the brief: "Pick your Carbon" quiz, drip sound, Google review link from QR, LocalBusiness schema, "nearest outlet" at the clock end | LocalBusiness schema only; the rest logged as "later"                                | M1        |
| Q-03 | Booking step count: brief says six, blueprint says five or fewer from home                                                                                   | Brief's six; the large-group request replaces step 5's pay choice                    | M3        |
| Q-04 | Outlet slugs and display names                                                                                                                               | `c-scheme`, `raja-park` ("Raja Park / Tilak Nagar"), `vaishali-nagar`                | M2        |
| Q-05 | Periodic tile symbols ("Cb", "Bl")                                                                                                                           | Derived by a fixed rule from the name, marked decorative                             | M2        |
| Q-06 | Serve `menu.pdf` as-is for download? It includes brand pages                                                                                                 | Yes, with its upload date shown                                                      | M2        |
| Q-07 | Sample events (Coffee Rave, Kitchen Rave, "Drip It Up") have no dates, prices or capacity                                                                    | Labelled "sample" with future dates, "Rs ---" prices                                 | M4        |
| Q-08 | Fictional customers in admin seed data                                                                                                                       | Obviously fake names and +91 90000 000xx numbers                                     | M3        |
| Q-09 | Paper theme accents (D-006) are derived darker shades, not Carbon colours                                                                                    | Use them; revisit if Carbon has a brand guide                                        | M2        |

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
