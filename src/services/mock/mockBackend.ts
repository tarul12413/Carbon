import { runIdempotent, type IdempotencyLedger } from "@/domain/idempotency";
import type { Outlet } from "@/domain/outlet";
import { err, ok } from "@/lib/result";
import type { BookingService } from "../bookings";
import type { DemoControls } from "../demo";
import type { ServiceResult } from "../errors";
import { signStampQr } from "@/domain/loyalty/qr";
import type { Order, WebhookEvent } from "@/domain/orders/schema";
import type { DemoGateway, TicketingService } from "../ticketing";
import type { LoyaltyService } from "../loyalty";
import type { StaffService } from "../staff";
import * as bookingEngine from "./bookingEngine";
import * as loyaltyEngine from "./loyaltyEngine";
import { mockDbSchema, seedDb, type EngineContext, type MockDb } from "./db";
import { sampleEvents } from "./events";
import * as ordersEngine from "./ordersEngine";

/** Where the mock database lives: memory (route handlers, tests) or the visitor's browser (D-026). */
export interface DbStore {
  read(): MockDb | null;
  write(db: MockDb): void;
}

export function memoryStore(): DbStore {
  let saved: string | null = null;
  return {
    read: () => (saved ? mockDbSchema.parse(JSON.parse(saved)) : null),
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

export interface MockBackend {
  readonly bookings: BookingService;
  readonly ticketing: TicketingService;
  readonly gateway: DemoGateway;
  readonly loyalty: LoyaltyService;
  readonly staff: StaffService;
  readonly demo: DemoControls;
  /** Our side of the payment webhook (POST /api/webhooks/payments). */
  readonly webhooks: { receive(event: Omit<WebhookEvent, "receivedAt">): Promise<ServiceResult<Order>> };
}

/**
 * Wraps the engines with load → sweep → run → save, so each call is one atomic step, and with the
 * idempotency ledger for writes.
 */
export function createMockBackend(options: BackendOptions): MockBackend {
  const clock = options.clock ?? (() => new Date());
  const random = options.random ?? Math.random;
  const context = (): EngineContext => {
    const now = clock();
    return {
      now,
      timeZone: options.timeZone,
      outlets: options.outlets,
      events: sampleEvents(now, options.timeZone),
      random,
    };
  };

  const run = <T>(fn: (db: MockDb, ctx: EngineContext) => T): T => {
    const ctx = context();
    const db = options.store.read() ?? seedDb(ctx);
    bookingEngine.sweepExpiredHolds(db, ctx.now);
    ordersEngine.sweepOrders(db, ctx);
    loyaltyEngine.sweepLoyalty(db, ctx);
    const result = fn(db, ctx);
    options.store.write(db);
    return result;
  };

  const write = <T>(key: string, request: unknown, fn: (db: MockDb, ctx: EngineContext) => ServiceResult<T>) =>
    run(async (db, ctx): Promise<ServiceResult<T>> => {
      const ledger = db.idempotency as IdempotencyLedger<T>;
      const outcome = runIdempotent(ledger, key, request, ctx.now, () => fn(db, ctx));
      if (outcome.kind === "conflict") return err({ code: "idempotency_conflict" });
      return outcome.ok ? ok(outcome.value) : err(outcome.error);
    });
  const read = <T>(fn: (db: MockDb, ctx: EngineContext) => T) => run(async (db, ctx) => fn(db, ctx));

  const bookings: BookingService = {
    getAvailability: (query) => read((db, ctx) => bookingEngine.getAvailability(db, ctx, query)),
    createHold: (input, key) =>
      write(key, { op: "hold", input }, (db, ctx) => bookingEngine.createHold(db, ctx, input)),
    confirm: (code, input, key) =>
      write(key, { op: "confirm", code, input }, (db, ctx) => bookingEngine.confirm(db, ctx, code, input)),
    sendRequest: (code, input, key) =>
      write(key, { op: "request", code, input }, (db, ctx) => bookingEngine.sendRequest(db, ctx, code, input)),
    change: (code, input, key) =>
      write(key, { op: "change", code, input }, (db, ctx) => bookingEngine.change(db, ctx, code, input)),
    cancel: (code, key) => write(key, { op: "cancel", code }, (db, ctx) => bookingEngine.cancel(db, ctx, code)),
    getBooking: (code) => read((db) => bookingEngine.getBooking(db, code)),
  };

  const ticketing: TicketingService = {
    getAvailability: (slug) => read((db, ctx) => ordersEngine.getAvailability(db, ctx, slug)),
    createOrder: (input, key) =>
      write(key, { op: "order", input }, (db, ctx) => ordersEngine.createOrder(db, ctx, input)),
    createDepositOrder: (input, key) =>
      write(key, { op: "deposit", input }, (db, ctx) => ordersEngine.createDepositOrder(db, ctx, input)),
    getOrder: (id) => read((db) => ordersEngine.getOrder(db, id)),
    checkout: (id, input, key) =>
      write(key, { op: "checkout", id, input }, (db, ctx) => ordersEngine.checkout(db, ctx, id, input)),
    verifyPayment: (id, proof, key) =>
      write(key, { op: "verify", id, proof }, (db) => ordersEngine.verifyPayment(db, id, proof)),
    getTicket: (code) => read((db) => ordersEngine.getTicket(db, code)),
    cancelTicket: (code, key) =>
      write(key, { op: "cancel-ticket", code }, (db, ctx) => ordersEngine.cancelTicket(db, ctx, code)),
    joinWaitlist: (input, key) =>
      write(key, { op: "waitlist", input }, (db, ctx) => ordersEngine.joinWaitlist(db, ctx, input)),
    getWaitlistEntry: (id) => read((db) => ordersEngine.getWaitlistEntry(db, id)),
  };

  const loyalty: LoyaltyService = {
    requestOtp: (input, key) => write(key, { op: "otp", input }, (db, ctx) => loyaltyEngine.requestOtp(db, ctx, input)),
    verifyOtp: (input, key) =>
      write(key, { op: "otp-verify", input }, (db, ctx) => loyaltyEngine.verifyOtp(db, ctx, input)),
    getCard: (session) => read((db, ctx) => loyaltyEngine.getCard(db, ctx, session)),
    getQr: (session) => read((db, ctx) => loyaltyEngine.getQr(db, ctx, session)),
    signOut: (session) => read((db) => loyaltyEngine.signOut(db, session)),
    deleteCard: (session) => read((db, ctx) => loyaltyEngine.deleteCard(db, ctx, session)),
  };

  const staff: StaffService = {
    findCard: (actor, lookup) => read((db, ctx) => loyaltyEngine.findCard(db, ctx, actor, lookup)),
    addStamp: (actor, customerId, key) =>
      write(key, { op: "stamp", actor, customerId }, (db, ctx) => loyaltyEngine.addStamp(db, ctx, actor, customerId)),
    undoStamp: (actor, entryId, key) =>
      write(key, { op: "undo", actor, entryId }, (db, ctx) => loyaltyEngine.undoStamp(db, ctx, actor, entryId)),
    redeem: (actor, customerId, pin, key) =>
      write(key, { op: "redeem", actor, customerId }, (db, ctx) =>
        loyaltyEngine.redeem(db, ctx, actor, customerId, pin),
      ),
    findTicket: (actor, lookup) => read((db) => loyaltyEngine.findTicket(db, actor, lookup)),
    checkIn: (actor, code, collected, key) =>
      write(key, { op: "check-in", actor, code, collected }, (db, ctx) =>
        loyaltyEngine.checkIn(db, ctx, actor, code, collected),
      ),
  };

  /** The sample gateway is "someone else's system": no idempotency ledger, its own event ids. */
  const gateway: DemoGateway = {
    pay: (gatewayOrderId, outcome) => read((db, ctx) => ordersEngine.gatewayPay(db, ctx, gatewayOrderId, outcome)),
    settlePending: (gatewayOrderId, outcome, twice) =>
      read((db, ctx) => ordersEngine.gatewaySettle(db, ctx, gatewayOrderId, outcome, twice)),
  };

  const demo: DemoControls = {
    async reset() {
      options.store.write(seedDb(context()));
    },
    expireHolds: () =>
      read((db, ctx) => {
        const holds = [
          ...db.bookings.filter((b) => b.status === "held"),
          ...db.orders.filter((o) => o.status === "held"),
        ];
        for (const hold of holds) hold.holdExpiresAt = ctx.now.toISOString();
        bookingEngine.sweepExpiredHolds(db, ctx.now);
        ordersEngine.sweepOrders(db, ctx);
        return holds.length;
      }),
    openSeat: (slug) => read((db, ctx) => ordersEngine.openSeat(db, ctx, slug)),
    scannable: () =>
      read((db, ctx) => {
        const session = db.sessions.at(-1);
        const ticket = db.tickets.filter((t) => t.status === "valid" && !t.checkedInAt).at(-1);
        return {
          stamp: session ? signStampQr(session.customerId, ctx.now).token : null,
          ticket: ticket?.token ?? null,
        };
      }),
  };

  const webhooks = {
    receive: (event: Omit<WebhookEvent, "receivedAt">) => read((db, ctx) => ordersEngine.handleWebhook(db, ctx, event)),
  };

  return { bookings, ticketing, gateway, loyalty, staff, demo, webhooks };
}
