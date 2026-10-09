import { runIdempotent } from "@/domain/idempotency";
import type { Outlet } from "@/domain/outlet";
import { err } from "@/lib/result";
import type { BookingResult, BookingService, DemoControls } from "../bookings";
import * as engine from "./bookingEngine";
import type { BookingDb, EngineContext } from "./bookingEngine";

/** Where the mock database lives: memory (route handlers, tests) or the visitor's browser (D-004). */
export interface DbStore {
  read(): BookingDb | null;
  write(db: BookingDb): void;
}

export function memoryStore(): DbStore {
  let saved: string | null = null;
  return {
    read: () => (saved ? engine.bookingDbSchema.parse(JSON.parse(saved)) : null),
    write: (db) => {
      saved = JSON.stringify(db);
    },
  };
}

export interface BackendOptions {
  readonly store: DbStore;
  readonly outlets: readonly Outlet[];
  readonly timeZone: string;
  readonly clock?: () => Date;
  readonly random?: () => number;
}

export type BookingBackend = BookingService & DemoControls;

/**
 * Wraps the engine with load → run → save, so each call is one atomic step, and with the
 * idempotency ledger for writes.
 */
export function createBookingBackend(options: BackendOptions): BookingBackend {
  const clock = options.clock ?? (() => new Date());
  const random = options.random ?? Math.random;
  const context = (): EngineContext => ({ now: clock(), timeZone: options.timeZone, outlets: options.outlets, random });

  const run = <T>(fn: (db: BookingDb, ctx: EngineContext) => T): T => {
    const ctx = context();
    const db = options.store.read() ?? engine.seedDb(ctx);
    engine.sweepExpiredHolds(db, ctx.now);
    const result = fn(db, ctx);
    options.store.write(db);
    return result;
  };

  const write = (key: string, request: unknown, fn: (db: BookingDb, ctx: EngineContext) => BookingResult) =>
    run((db, ctx): BookingResult => {
      const outcome = runIdempotent(db.idempotency, key, request, ctx.now, () => fn(db, ctx));
      if (outcome.kind === "conflict") return err({ code: "idempotency_conflict" });
      return outcome.ok ? { ok: true, value: outcome.value } : { ok: false, error: outcome.error };
    });

  return {
    async getAvailability(query) {
      return run((db, ctx) => engine.getAvailability(db, ctx, query));
    },
    async createHold(input, key) {
      return write(key, { op: "hold", input }, (db, ctx) => engine.createHold(db, ctx, input));
    },
    async confirm(code, input, key) {
      return write(key, { op: "confirm", code, input }, (db, ctx) => engine.confirm(db, ctx, code, input));
    },
    async sendRequest(code, input, key) {
      return write(key, { op: "request", code, input }, (db, ctx) => engine.sendRequest(db, ctx, code, input));
    },
    async change(code, input, key) {
      return write(key, { op: "change", code, input }, (db, ctx) => engine.change(db, ctx, code, input));
    },
    async cancel(code, key) {
      return write(key, { op: "cancel", code }, (db, ctx) => engine.cancel(db, ctx, code));
    },
    async getBooking(code) {
      return run((db) => engine.getBooking(db, code));
    },
    async reset() {
      options.store.write(engine.seedDb(context()));
    },
    async expireHolds() {
      return run((db, ctx) => engine.expireHolds(db, ctx));
    },
  };
}
