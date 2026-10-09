/**
 * All user-facing copy lives here so it can be edited in one place.
 * Voice: short, dry, confident, no jargon. Everything is draft until the founders sign off.
 * Facts come from docs/BRIEF.md, the blueprint, or Carbon's March 2026 menu (page noted).
 */

export const copy = {
  meta: {
    title: "Carbon, Jaipur",
    description: "Cold brew steeped 18 to 96 hours. Three outlets in Jaipur.",
  },
  nav: {
    label: "Main",
    menu: "Menu",
    coldBrew: "Cold brew",
    outlets: "Outlets",
    events: "Events",
    story: "Story",
    enquire: "Enquire",
    book: "Book a table",
    bookShort: "Book",
    open: "Open navigation",
    close: "Close navigation",
    home: "Carbon, home",
    skip: "Skip to content",
  },
  home: {
    hero: {
      lead: "Brewed",
      accent: "slowly.",
      sub: "18 to 96 hours. Worth the wait.",
      book: "Book a table",
      menu: "See the menu",
      scrollHint: "Scroll to steep",
    },
    clock: {
      eyebrow: "Steep clock",
      title: "Seven cold brews. Each one takes its time.",
      /** Carbon's own words, menu page 3. */
      intro: "Cold brew isn't just iced coffee. We brew it slow.",
      hint: "Scroll moves the clock.",
      waiting: "Nothing's ready yet. Keep scrolling.",
      prev: "Previous brew",
      next: "Next brew",
      seeInMenu: "See in menu",
      steeped: (hours: number) => `Steeped ${hours} hours`,
      clockLabel: (hours: number) => `${hours} hours steeped`,
      typedLine: (hours: number, names: string) => `${hours}h. ${names}.`,
    },
    today: {
      eyebrow: "Today at Carbon",
      lead: "Okay.",
      accent: "Come have one.",
      outletLink: (name: string) => `${name} outlet`,
    },
    signatures: {
      eyebrow: "Signatures",
      title: "Three that carry the name.",
      servedHot: "Served hot",
      cta: "See the full menu",
    },
    outlets: {
      eyebrow: "Outlets",
      title: "Three in Jaipur.",
      photo: (name: string) => `Outlet photo: ${name}`,
      book: "Book here",
      details: "Outlet page",
    },
    events: {
      eyebrow: "Events",
      title: "Raves, workshops, launches.",
      items: [
        { name: "Coffee Raves", line: "Packed nights with a DJ." },
        { name: "Drip It Up", line: "Coffee brewing workshops." },
        { name: "Launches", line: "BMW Motorrad launched here on 21 June 2025." },
      ],
      cta: "See what's on",
      host: "Host something here",
    },
    proof: {
      eyebrow: "Proof",
      title: "Other people said it first.",
      awardsLabel: "Awards",
      awards: [
        { org: "EazyDiner Foodie Awards", title: "Best Cafe" },
        { org: "Zomato Restaurant Awards 2025", title: "Top 10 in Coffee, Jaipur" },
        { org: "Travel + Leisure Delicious Dining 2025", title: "Best Cafe" },
      ],
      pressLabel: "In the press",
      press: ["Hospemag", "Restaurant India", "Curly Tales"],
    },
    bookWall: {
      eyebrow: "Book wall",
      title: "Leave a book on the shelf.",
      body: "Tell us what you're reading. It goes up once staff have had a look.",
      cta: "Add your book",
    },
  },
  status: {
    open: (closes: string) => `Open now, till ${closes}`,
    opensToday: (opens: string) => `Closed. Opens ${opens}`,
    opensTomorrow: (opens: string) => `Closed. Opens ${opens} tomorrow`,
    hours: (opens: string, closes: string) => `${opens} to ${closes}`,
  },
  footer: {
    /** Carbon's own line, menu page 1. */
    line: "Coffee stronger than your ex.",
    hours: "Hours",
    outlets: "Outlets",
    explore: "Explore",
    whatsapp: "WhatsApp us",
    legal: "Privacy, terms and refunds",
    demo: "A concept demo. Not Carbon's official website.",
  },
  m0: {
    styleguideTitle: "Tokens and type",
  },
} as const;
