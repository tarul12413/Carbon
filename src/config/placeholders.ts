/**
 * Every value Carbon has not confirmed lives here, and nowhere else.
 * Each entry is mirrored in OPEN_QUESTIONS.md under the same id.
 * When Carbon answers, change the value, set `confirmed: true`, and close the question.
 */

export interface Placeholder<T> {
  readonly id: string;
  readonly value: T;
  readonly confirmed: false;
  readonly note: string;
}

const placeholder = <T>(id: string, value: T, note: string): Placeholder<T> => ({
  id,
  value,
  confirmed: false,
  note,
});

export const placeholders = {
  instantMaxPartySize: placeholder(
    "P-01",
    6,
    "Groups at or below this size confirm instantly; larger groups send a request. Per outlet.",
  ),
  holdMinutes: placeholder("P-02", 10, "How long a table or event seat is held during checkout."),
  ticketPriceLabel: placeholder("P-03", "Rs ---", "Event ticket prices are unknown; shown as text, never computed."),
  depositPriceLabel: placeholder("P-04", "Rs ---", "Optional online table deposit amount is unknown."),
  cancellationWindow: placeholder(
    "P-05",
    { label: "X hours", demoHours: 2 },
    "How long before a booking or event a customer can still change or cancel. The label is shown; demoHours only drives the demo's logic.",
  ),
  stampRewardThreshold: placeholder("P-06", 8, "Stamps needed for a reward, if Carbon runs a stamp card at all."),
  groupReplyTimeLabel: placeholder("P-07", "X hours", "How fast staff reply to large-group requests."),
  openingHours: placeholder(
    "P-08",
    { open: "09:00", close: "23:45" },
    "Listings conflict: 23:45 (Google, Zomato, District), 23:59 (Swiggy), midnight (Instagram). Same hours assumed at every outlet.",
  ),
  vaishaliNagarAddress: placeholder(
    "P-09",
    "Address to be confirmed",
    "Sources conflict between B-42 Prince Road and Plot 42, Yojna-9 B, Bhan Nagar.",
  ),
  rajaParkBuildingNumber: placeholder(
    "P-10",
    "Shanti Path (building number to be confirmed)",
    "Only the street is known.",
  ),
  whatsappNumber: placeholder("P-11", "+910000000000", "Fictional. Carbon's WhatsApp number has not been given."),
  slotMinutes: placeholder("P-12", 30, "Booking slot length. Blueprint open item 5."),
  dwellMinutes: placeholder("P-13", 90, "How long a table stays occupied. Blueprint open item 5."),
  capacityPerSlot: placeholder("P-14", 24, "Seats bookable per slot per outlet. Blueprint open item 5."),
  minLeadMinutes: placeholder("P-15", 60, "Earliest a same-day booking can start, from now."),
  maxDaysAhead: placeholder("P-16", 30, "How far ahead a table can be booked."),
  stampMinGapMinutes: placeholder("P-17", 30, "Minimum time between two stamps for the same customer."),
  noticeVersion: placeholder(
    "P-18",
    "draft-0",
    "Privacy notice version recorded with consent. Legal text is not written yet.",
  ),
  outletVibeLine: placeholder(
    "P-19",
    "",
    "One line per outlet about the room, from the staff. The pitch plan says to ask rather than invent.",
  ),
  pressLinks: placeholder(
    "P-20",
    "",
    "Article URLs for the three press pieces. The brief asks for titles only, with placeholder links.",
  ),
  maxPartySize: placeholder(
    "P-21",
    20,
    "Largest party the booking form takes. Bigger groups are pointed to the enquiry form (Blueprint 5.3).",
  ),
  payAtCafeDeadline: placeholder(
    "P-22",
    { label: "a time Carbon sets", demoHours: 2 },
    "Event seats reserved to pay at the cafe are released if unpaid by this deadline. The label is shown; demoHours (before the start) drives the demo's logic.",
  ),
  waitlistClaimMinutes: placeholder(
    "P-23",
    30,
    "When a seat opens, the first person on the waitlist has this long to claim it before it goes to the next.",
  ),
  ticketsPerOrderMax: placeholder("P-24", 6, "Most tickets one order can hold."),
  otpRules: placeholder(
    "P-25",
    { validMinutes: 5, maxAttempts: 5, resendSeconds: 30, requestsPerHour: 3 },
    "Sign-in code rules for the stamp card. Blueprint section 9 lists these numbers as placeholders.",
  ),
  stampUndoMinutes: placeholder("P-26", 2, "How long a barista can undo a stamp they just added."),
  stampReward: placeholder("P-27", "Set by Carbon", "What a full card earns. Carbon may not run a stamp card yet."),
  outletPin: placeholder(
    "P-28",
    "1896",
    "Mock outlet PIN for redeeming a full card. The same for every outlet in the demo; real PINs are never in code.",
  ),
  wallPerHour: placeholder("P-29", 3, "Book wall submissions allowed per device (Phase 2: per IP) in an hour."),
  enquiryReplyTime: placeholder(
    "P-30",
    "X hours",
    "How fast Carbon replies to catering, collab and workshop enquiries.",
  ),
  privacyContact: placeholder(
    "P-31",
    "the contact Carbon names",
    "Who handles privacy requests and grievances (DPDP Act). Not given.",
  ),
  retentionPeriod: placeholder(
    "P-32",
    "an agreed period",
    "How long bookings, tickets and enquiries are kept before they are anonymised (Blueprint section 12, to agree with Carbon).",
  ),
  legalEntity: placeholder(
    "P-33",
    "Carbon (registered business name to be confirmed)",
    "The legal entity that runs the cafes, for the privacy notice and terms.",
  ),
} as const;

export type PlaceholderKey = keyof typeof placeholders;
