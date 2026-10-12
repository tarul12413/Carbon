import { z } from "zod";
import seed from "../../../data/wall.json";
import { placeholders } from "@/config/placeholders";
import { ENQUIRY_LIMITS, enquiryInputSchema, type Enquiry } from "@/domain/enquiry";
import { localDate } from "@/domain/time";
import { hasProfanity } from "@/domain/wall/profanity";
import { WALL_MIN_FILL_SECONDS, wallInputSchema, type WallEntry } from "@/domain/wall/schema";
import { titleKey } from "@/domain/wall/spine";
import { err, ok } from "@/lib/result";
import type { ServiceResult } from "../errors";
import type { Shelf, Spine, WallReceipt } from "../wall";
import { invalidInput, randomId, type EngineContext, type MockDb } from "./db";

/**
 * The mock book wall and enquiry inbox (Blueprint 5.6 and section 9). Pure functions over the
 * database, one step per call.
 */

const DUPLICATE_MS = 5 * 60_000;
const HOUR_MS = 60 * 60_000;

const wallSeedSchema = z.object({
  books: z.array(
    z.object({
      title: z.string(),
      author: z.string(),
      readers: z.array(z.object({ line: z.string(), handle: z.string().optional() })).min(1),
    }),
  ),
});

/** The sample shelf, approved, oldest first. */
export function seedWall(ctx: EngineContext): WallEntry[] {
  const entries: WallEntry[] = [];
  wallSeedSchema.parse(seed).books.forEach((book, b) =>
    book.readers.forEach((reader, r) =>
      entries.push({
        id: randomId("wal", ctx.random),
        kind: r === 0 ? "book" : reader.line ? "book" : "reader",
        key: titleKey(book.title),
        title: book.title,
        author: book.author,
        line: reader.line,
        handle: reader.handle ?? "",
        showName: Boolean(reader.handle),
        status: "approved",
        source: "seed",
        createdAt: new Date(ctx.now.getTime() - (60 - b) * 24 * HOUR_MS + r * HOUR_MS).toISOString(),
      }),
    ),
  );
  return entries;
}

function spinesOf(entries: readonly WallEntry[]): Spine[] {
  const byKey = new Map<string, WallEntry[]>();
  for (const e of entries) {
    if (e.status !== "approved") continue;
    byKey.set(e.key, [...(byKey.get(e.key) ?? []), e]);
  }
  return [...byKey.entries()].map(([key, group]) => {
    const first = group.find((e) => e.kind === "book") ?? group[0];
    return {
      key,
      title: first?.title ?? "",
      author: first?.author ?? "",
      readers: group.length,
      lines: group
        .filter((e) => e.line)
        .map((e) => ({ line: e.line, ...(e.showName && e.handle ? { name: e.handle } : {}) })),
    };
  });
}

export function getShelf(db: MockDb): ServiceResult<Shelf> {
  const spines = spinesOf(db.wall);
  return ok({
    spines,
    readers: spines.reduce((sum, s) => sum + s.readers, 0),
    waiting: db.wall.filter((e) => e.status === "pending").length,
  });
}

/** Submissions from this device in the last hour (Phase 2: per IP, at the edge). */
const recentFromWeb = (db: MockDb, now: Date) =>
  db.wall.filter((e) => e.source === "web" && now.getTime() - Date.parse(e.createdAt) < HOUR_MS).length;

export function submit(db: MockDb, ctx: EngineContext, raw: unknown): ServiceResult<WallReceipt> {
  const parsed = wallInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const input = parsed.data;
  if (ctx.now.getTime() - input.openedAt < WALL_MIN_FILL_SECONDS * 1000) return err({ code: "bot_check" });
  if (hasProfanity(input.title, input.author, input.line, input.handle)) {
    return err({ code: "invalid_input", fields: { _: "profanity" } });
  }
  const key = titleKey(input.title);
  if (!key) return err({ code: "invalid_input", fields: { title: "title.required" } });

  const duplicate = db.wall.find(
    (e) =>
      e.source === "web" &&
      e.key === key &&
      e.line === input.line &&
      ctx.now.getTime() - Date.parse(e.createdAt) < DUPLICATE_MS,
  );
  if (duplicate) return ok({ id: duplicate.id, status: "pending" });
  if (recentFromWeb(db, ctx.now) >= placeholders.wallPerHour.value) {
    const oldest = db.wall
      .filter((e) => e.source === "web" && ctx.now.getTime() - Date.parse(e.createdAt) < HOUR_MS)
      .map((e) => Date.parse(e.createdAt))
      .sort((a, b) => a - b)[0];
    return err({ code: "rate_limited", retryAt: new Date((oldest ?? ctx.now.getTime()) + HOUR_MS).toISOString() });
  }

  const entry: WallEntry = {
    id: randomId("wal", ctx.random),
    kind: "book",
    key,
    title: input.title,
    author: input.author,
    line: input.line,
    handle: input.showName ? input.handle : "",
    showName: input.showName && input.handle.length > 0,
    status: "pending",
    source: "web",
    createdAt: ctx.now.toISOString(),
  };
  db.wall.push(entry);
  return ok({ id: entry.id, status: "pending" });
}

export function addReader(db: MockDb, ctx: EngineContext, key: string): ServiceResult<Spine> {
  const book = db.wall.find((e) => e.key === key && e.status === "approved");
  if (!book) return err({ code: "not_found" });
  if (recentFromWeb(db, ctx.now) >= placeholders.wallPerHour.value * 3) return err({ code: "rate_limited" });
  db.wall.push({
    id: randomId("wal", ctx.random),
    kind: "reader",
    key,
    title: book.title,
    author: book.author,
    line: "",
    handle: "",
    showName: false,
    status: "approved",
    source: "web",
    createdAt: ctx.now.toISOString(),
  });
  const spine = spinesOf(db.wall).find((s) => s.key === key);
  return spine ? ok(spine) : err({ code: "not_found" });
}

export function report(db: MockDb, ctx: EngineContext, key: string): ServiceResult<null> {
  if (!db.wall.some((e) => e.key === key && e.status === "approved")) return err({ code: "not_found" });
  db.wallReports.push({ key, at: ctx.now.toISOString() });
  return ok(null);
}

/** Demo control standing in for staff moderation (M7): approve everything waiting. */
export function approveWaiting(db: MockDb): number {
  const waiting = db.wall.filter((e) => e.status === "pending");
  for (const e of waiting) e.status = "approved";
  return waiting.length;
}

/* Enquiries */

function newEnquiryCode(db: MockDb, random: () => number): string {
  const taken = new Set(db.enquiries.map((e) => e.code));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = `ENQ-${1000 + Math.floor(random() * 9000)}`;
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not find a free enquiry code");
}

export function submitEnquiry(db: MockDb, ctx: EngineContext, raw: unknown): ServiceResult<Enquiry> {
  const parsed = enquiryInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const input = parsed.data;
  if (input.date && input.date < localDate(ctx.now, ctx.timeZone)) {
    return err({ code: "invalid_input", fields: { date: "date.past" } });
  }
  const duplicate = db.enquiries.find(
    (e) =>
      e.phone === input.phone &&
      e.type === input.type &&
      e.details === input.details.slice(0, ENQUIRY_LIMITS.details) &&
      ctx.now.getTime() - Date.parse(e.createdAt) < DUPLICATE_MS,
  );
  if (duplicate) return ok(duplicate);

  const enquiry: Enquiry = {
    code: newEnquiryCode(db, ctx.random),
    type: input.type,
    name: input.name,
    phone: input.phone,
    ...(input.outlet ? { outlet: input.outlet } : {}),
    ...(input.date ? { date: input.date } : {}),
    ...(input.guests ? { guests: input.guests } : {}),
    details: input.details,
    whatsappOptIn: input.whatsappOptIn,
    consent: { noticeVersion: input.noticeVersion, at: ctx.now.toISOString() },
    status: "new",
    createdAt: ctx.now.toISOString(),
  };
  db.enquiries.push(enquiry);
  return ok(enquiry);
}
