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
import type { EnquiryService } from "../enquiries";
import type { StaffService } from "../staff";
import type { WallService } from "../wall";
import type { AdminService } from "../admin";
import * as adminEngine from "./adminEngine";
import * as bookingEngine from "./bookingEngine";
import * as loyaltyEngine from "./loyaltyEngine";
import * as wallEngine from "./wallEngine";
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
  readonly wall: WallService;
  readonly enquiries: EnquiryService;
  readonly admin: AdminService;
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
    if (!db.wallSeeded) {
      db.wall = [...wallEngine.seedWall(ctx), ...db.wall];
      db.wallSeeded = true;
    }
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

  const wall: WallService = {
    getShelf: () => read((db) => wallEngine.getShelf(db)),
    submit: (input, key) => write(key, { op: "wall", input }, (db, ctx) => wallEngine.submit(db, ctx, input)),
    addReader: (spine, key) =>
      write(key, { op: "wall-reader", spine }, (db, ctx) => wallEngine.addReader(db, ctx, spine)),
    report: (spine, key) => write(key, { op: "wall-report", spine }, (db, ctx) => wallEngine.report(db, ctx, spine)),
  };

  const enquiries: EnquiryService = {
    submit: (input, key) => write(key, { op: "enquiry", input }, (db, ctx) => wallEngine.submitEnquiry(db, ctx, input)),
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

  const admin: AdminService = {
    dashboard: (actor, scope) => read((db, ctx) => adminEngine.dashboard(db, ctx, actor, scope)),
    listBookings: (actor, query) => read((db, ctx) => adminEngine.listBookings(db, ctx, actor, query)),
    decideBooking: (actor, code, decision, key) =>
      write(key, { op: "admin-booking", actor, code, decision }, (db, ctx) =>
        adminEngine.decideBooking(db, ctx, actor, code, decision),
      ),
    getSettings: (actor) => read((db, ctx) => adminEngine.getSettings(db, ctx, actor)),
    saveSettings: (actor, outlet, input, key) =>
      write(key, { op: "admin-settings", actor, outlet, input }, (db, ctx) =>
        adminEngine.saveSettings(db, ctx, actor, outlet, input),
      ),
    getMenu: (actor) => read((db, ctx) => adminEngine.getMenu(db, ctx, actor)),
    saveDraft: (actor, itemId, input, key) =>
      write(key, { op: "admin-draft", actor, itemId, input }, (db, ctx) =>
        adminEngine.saveDraft(db, ctx, actor, itemId, input),
      ),
    publishMenu: (actor, key) =>
      write(key, { op: "admin-publish", actor }, (db, ctx) => adminEngine.publishMenu(db, ctx, actor)),
    setAvailability: (actor, outlet, itemId, available, key) =>
      write(key, { op: "admin-availability", actor, outlet, itemId, available }, (db, ctx) =>
        adminEngine.setAvailability(db, ctx, actor, outlet, itemId, available),
      ),
    uploadMenuPdf: (actor, input, key) =>
      write(key, { op: "admin-pdf", actor, input }, (db, ctx) => adminEngine.uploadMenuPdf(db, ctx, actor, input)),
    listEvents: (actor) => read((db, ctx) => adminEngine.listEvents(db, ctx, actor)),
    attendees: (actor, slug) => read((db, ctx) => adminEngine.attendees(db, ctx, actor, slug)),
    checkIn: (actor, code, collected, key) =>
      write(key, { op: "admin-check-in", actor, code, collected }, (db, ctx) =>
        adminEngine.checkIn(db, ctx, actor, code, collected),
      ),
    markPaid: (actor, code, key) =>
      write(key, { op: "admin-paid", actor, code }, (db, ctx) => adminEngine.markPaid(db, ctx, actor, code)),
    wallQueue: (actor) => read((db) => adminEngine.wallQueue(db, actor)),
    moderate: (actor, entryId, decision, key) =>
      write(key, { op: "admin-moderate", actor, entryId, decision }, (db, ctx) =>
        adminEngine.moderate(db, ctx, actor, entryId, decision),
      ),
    resolveReport: (actor, spineKey, decision, key) =>
      write(key, { op: "admin-report", actor, spineKey, decision }, (db, ctx) =>
        adminEngine.resolveReport(db, ctx, actor, spineKey, decision),
      ),
    listEnquiries: (actor) => read((db) => adminEngine.listEnquiries(db, actor)),
    updateEnquiry: (actor, code, update, key) =>
      write(key, { op: "admin-enquiry", actor, code, update }, (db, ctx) =>
        adminEngine.updateEnquiry(db, ctx, actor, code, update),
      ),
    audit: (actor, scope) => read((db) => adminEngine.audit(db, actor, scope)),
  };

  return { bookings, ticketing, gateway, loyalty, staff, wall, enquiries, admin, demo, webhooks };
}
