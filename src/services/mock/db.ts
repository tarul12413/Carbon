import { z } from "zod";
import seed from "../../../data/bookings.json";
import stampSeed from "../../../data/stamps.json";
import { newBookingCode } from "@/domain/booking/code";
import { bookingSchema, type Booking } from "@/domain/booking/schema";
import type { EventInfo } from "@/domain/events/types";
import { enquirySchema } from "@/domain/enquiry/schema";
import { toMinutes } from "@/domain/hours";
import {
  auditEntrySchema,
  customerSchema,
  customerSessionSchema,
  otpChallengeSchema,
  rewardSchema,
  stampEntrySchema,
  type Customer,
  type StampEntry,
} from "@/domain/loyalty/schema";
import {
  orderSchema,
  ticketSchema,
  waitlistEntrySchema,
  webhookEventSchema,
  type WaitlistEntry,
} from "@/domain/orders/schema";
import { OUTLET_SLUGS, type Outlet } from "@/domain/outlet";
import { addDays, localDate, zonedInstant } from "@/domain/time";
import { wallEntrySchema, wallReportSchema } from "@/domain/wall/schema";
import type { ServiceError } from "../errors";

/**
 * The mock database: one plain object, so a single call can change a booking and the order that
 * pays its deposit together. Saved whole after each call (D-026).
 */
export const mockDbSchema = z.object({
  version: z.literal(2),
  bookings: z.array(bookingSchema),
  orders: z.array(orderSchema),
  tickets: z.array(ticketSchema),
  waitlist: z.array(waitlistEntrySchema),
  /** Payment webhooks already handled, by event id (Blueprint section 9: webhook_events). */
  webhooks: z.array(webhookEventSchema),
  /** Seats freed by the demo control "someone cancels", by "event:ticket type". */
  released: z.record(z.string(), z.number().int().nonnegative()),
  idempotency: z.record(z.string(), z.object({ fingerprint: z.string(), at: z.string(), response: z.unknown() })),
  /* Stamp card (M5). Defaults let a version 2 database saved before M5 load as it is. */
  customers: z.array(customerSchema).default([]),
  otpChallenges: z.array(otpChallengeSchema).default([]),
  sessions: z.array(customerSessionSchema).default([]),
  stamps: z.array(stampEntrySchema).default([]),
  rewards: z.array(rewardSchema).default([]),
  audit: z.array(auditEntrySchema).default([]),
  /* Book wall and enquiries (M6). */
  wall: z.array(wallEntrySchema).default([]),
  wallReports: z.array(wallReportSchema).default([]),
  /** False on a database saved before M6, so the sample shelf is added once. */
  wallSeeded: z.boolean().default(false),
  enquiries: z.array(enquirySchema).default([]),
});
export type MockDb = z.infer<typeof mockDbSchema>;

export interface EngineContext {
  readonly now: Date;
  readonly timeZone: string;
  readonly outlets: readonly Outlet[];
  /** The sample events as of `now`. */
  readonly events: readonly EventInfo[];
  readonly random: () => number;
}

/** "ord_k3x9q0w2ab"-style ids from the injected random source. */
export function randomId(prefix: string, random: () => number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  return `${prefix}_${Array.from({ length: 10 }, () => alphabet[Math.floor(random() * alphabet.length)]).join("")}`;
}

export const invalidInput = (issues: readonly { path: PropertyKey[]; message: string }[]): ServiceError => ({
  code: issues.some((i) => i.message === "bot") ? "bot_check" : "invalid_input",
  fields: Object.fromEntries(issues.map((i) => [i.path.map(String).join(".") || "_", i.message])),
});

const bookingSeedSchema = z.object({
  bookings: z.array(
    z.object({
      dayOffset: z.number().int().min(0),
      outlet: z.enum(OUTLET_SLUGS),
      time: z.string(),
      partySize: z.number().int().positive(),
      status: z.enum(["confirmed", "requested"]),
      occasion: z.string().optional(),
    }),
  ),
});

const stampSeedSchema = z.object({
  customers: z.array(
    z.object({
      name: z.string(),
      stamps: z.array(z.object({ daysAgo: z.number().int().positive(), outlet: z.enum(OUTLET_SLUGS) })),
    }),
  ),
});

/** Fictional stamp cards (Q-08), so the scanner has someone to look up by phone. */
function seedCards(ctx: EngineContext, at: string): Pick<MockDb, "customers" | "stamps"> {
  const customers: Customer[] = [];
  const stamps: StampEntry[] = [];
  stampSeedSchema.parse(stampSeed).customers.forEach((c, i) => {
    const id = randomId("cus", ctx.random);
    customers.push({
      id,
      phone: `+9190000002${String(i + 1).padStart(2, "0")}`,
      name: c.name,
      consent: { noticeVersion: "seed", at },
      source: "seed",
      createdAt: at,
    });
    for (const s of c.stamps) {
      stamps.push({
        id: randomId("stp", ctx.random),
        customerId: id,
        delta: 1,
        reason: "visit",
        outlet: s.outlet,
        staffId: "seed",
        at: new Date(ctx.now.getTime() - s.daysAgo * 24 * 60 * 60_000).toISOString(),
      });
    }
  });
  stamps.sort((a, b) => a.at.localeCompare(b.at));
  return { customers, stamps };
}

/** Fresh database: fictional bookings, waitlist entries and stamp cards (Q-08), dated from today. */
export function seedDb(ctx: EngineContext): MockDb {
  const today = localDate(ctx.now, ctx.timeZone);
  const at = ctx.now.toISOString();
  const taken = new Set<string>();
  const bookings = bookingSeedSchema.parse(seed).bookings.map((s, i): Booking => {
    const n = String(i + 1).padStart(2, "0");
    const date = addDays(today, s.dayOffset);
    const code = newBookingCode(taken, ctx.random);
    taken.add(code);
    return {
      code,
      outlet: s.outlet,
      date,
      time: s.time,
      startsAt: zonedInstant(date, toMinutes(s.time), ctx.timeZone).toISOString(),
      partySize: s.partySize,
      kind: s.status === "requested" ? "request" : "instant",
      status: s.status,
      name: `Sample guest ${n}`,
      phone: `+9190000000${n}`,
      note: "",
      whatsappOptIn: false,
      consent: { noticeVersion: "seed", at },
      holdExpiresAt: at,
      ...(s.status === "confirmed" ? { payment: "cafe" as const } : {}),
      ...(s.occasion ? { request: { occasion: s.occasion, budgetPerHead: "" } } : {}),
      source: "seed",
      createdAt: at,
      history: [{ status: s.status, at }],
    };
  });

  const waitlist = ctx.events.flatMap((event) =>
    Array.from({ length: event.seedWaitlist }, (_, i): WaitlistEntry => {
      const n = String(i + 1).padStart(2, "0");
      return {
        id: randomId("wl", ctx.random),
        eventSlug: event.slug,
        ticketTypeId: event.ticketTypes[0]?.id ?? "general",
        quantity: 1,
        phone: `+9190000001${n}`,
        whatsappOptIn: true,
        consent: { noticeVersion: "seed", at },
        status: "waiting",
        source: "seed",
        createdAt: new Date(ctx.now.getTime() - (event.seedWaitlist - i) * 60 * 60_000).toISOString(),
      };
    }),
  );

  return {
    version: 2,
    bookings,
    orders: [],
    tickets: [],
    waitlist,
    webhooks: [],
    released: {},
    idempotency: {},
    ...seedCards(ctx, at),
    otpChallenges: [],
    sessions: [],
    rewards: [],
    audit: [],
    wall: [],
    wallReports: [],
    wallSeeded: false,
    enquiries: [],
  };
}
