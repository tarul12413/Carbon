import { z } from "zod";
import seed from "../../../data/events.json";
import { site } from "@/config/site";
import { EVENT_KINDS, type EventInfo, type PastEvent } from "@/domain/events/types";
import { toMinutes } from "@/domain/hours";
import { OUTLET_SLUGS } from "@/domain/outlet";
import { addDays, localDate, zonedInstant } from "@/domain/time";
import type { EventCatalogue } from "../events";

const seedSchema = z.object({
  upcoming: z.array(
    z.object({
      slug: z.string().regex(/^[a-z0-9-]+$/),
      title: z.string(),
      kind: z.enum(EVENT_KINDS),
      outlet: z.enum(OUTLET_SLUGS),
      dayOffset: z.number().int().min(1),
      time: z.string(),
      durationMinutes: z.number().int().positive(),
      summary: z.string().optional(),
      ticketTypes: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          quota: z.number().int().positive(),
          seedSold: z.number().int().nonnegative(),
        }),
      ),
      seedWaitlist: z.number().int().nonnegative(),
    }),
  ),
  past: z.array(z.object({ title: z.string(), kind: z.enum(EVENT_KINDS), date: z.string() })),
});

const parsed = seedSchema.parse(seed);

/** The sample events, dated from `now` so the demo always has something coming up (Q-07). */
export function sampleEvents(now: Date, timeZone: string = site.timeZone): EventInfo[] {
  const today = localDate(now, timeZone);
  return parsed.upcoming
    .map((e): EventInfo => {
      const date = addDays(today, e.dayOffset);
      const starts = zonedInstant(date, toMinutes(e.time), timeZone);
      return {
        slug: e.slug,
        title: e.title,
        kind: e.kind,
        outlet: e.outlet,
        date,
        time: e.time,
        startsAt: starts.toISOString(),
        endsAt: new Date(starts.getTime() + e.durationMinutes * 60_000).toISOString(),
        ...(e.summary ? { summary: e.summary } : {}),
        ticketTypes: e.ticketTypes.map((t) => ({ ...t, pricePaise: null })),
        seedWaitlist: e.seedWaitlist,
        sample: true,
      };
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export const mockEventCatalogue: EventCatalogue = {
  async listUpcoming() {
    return sampleEvents(new Date());
  },
  async getEvent(slug) {
    return sampleEvents(new Date()).find((e) => e.slug === slug) ?? null;
  },
  async listPast(): Promise<readonly PastEvent[]> {
    return parsed.past;
  },
};
