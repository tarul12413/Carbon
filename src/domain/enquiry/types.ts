/** The brief's four kinds of enquiry (/enquire). No zod here, so forms can import it cheaply. */
export const ENQUIRY_TYPES = ["catering", "collab", "workshop", "other"] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

export const isEnquiryType = (value: string | null | undefined): value is EnquiryType =>
  typeof value === "string" && (ENQUIRY_TYPES as readonly string[]).includes(value);

export const ENQUIRY_LIMITS = { name: 60, details: 600, detailsMin: 10, guestsMax: 2000 } as const;
