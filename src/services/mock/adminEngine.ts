import {
  adminStaff,
  canDo,
  canOpen,
  seesOutlet,
  type AdminAction,
  type AdminActor,
  type AdminSection,
} from "@/domain/admin/access";
import {
  bookingDecisionSchema,
  enquiryUpdateSchema,
  menuEditInputSchema,
  outletSettingsInputSchema,
  pdfInputSchema,
  type MenuEdit,
  type OutletSettings,
} from "@/domain/admin/schema";
import type { AuditAction, AuditEntry } from "@/domain/audit";
import { seatsTaken, slotTimes } from "@/domain/booking/availability";
import { nextStatus } from "@/domain/booking/machine";
import { maskIndianMobile } from "@/domain/booking/phone";
import type { Booking } from "@/domain/booking/schema";
import { bookingSettingsFor } from "@/domain/booking/settings";
import type { Enquiry } from "@/domain/enquiry/schema";
import type { EventInfo } from "@/domain/events/types";
import { COLD_BREW_TAG, HOUSE_NAMED_TAG } from "@/domain/menu/browse";
import { applyEdit } from "@/domain/menu/overlay";
import type { MenuItem } from "@/domain/menu/schema";
import { nextOrderStatus } from "@/domain/orders/machine";
import type { OutletSlug } from "@/domain/outlet";
import type { StaffMember } from "@/domain/staff";
import { localDate, zonedInstant } from "@/domain/time";
import { err, ok } from "@/lib/result";
import type {
  AdminMenu,
  AttendeeList,
  BookingQuery,
  BookingRow,
  Dashboard,
  EventSales,
  OutletScope,
  OutletSettingsView,
  SettingsSaved,
  SlotLoad,
  WallQueue,
} from "../admin";
import type { ServiceError, ServiceResult } from "../errors";
import type { DoorView } from "../staff";
import { closedDates, hoursOf, settingsOf } from "./bookingEngine";
import { invalidInput, type EngineContext, type MockDb } from "./db";
import { checkIn as doorCheckIn } from "./loyaltyEngine";
import { baseMenu, menuDocument } from "./menu";
import { getAvailability as eventAvailability } from "./ordersEngine";

/**
 * The mock admin (Blueprint section 10). Pure functions over the database, one step per call.
 * Every function checks the account's role and outlets first, and every change is logged.
 */

const forbidden: ServiceError = { code: "forbidden" };
const isError = (value: StaffMember | ServiceError): value is ServiceError => "code" in value;

/** The account, if it may open this section. */
function opener(actor: AdminActor, section: AdminSection): StaffMember | ServiceError {
  const staff = adminStaff(actor);
  return staff && canOpen(staff, section) ? staff : forbidden;
}

/** The account, if it may take this action (at this outlet). */
function doer(actor: AdminActor, action: AdminAction, outlet?: OutletSlug): StaffMember | ServiceError {
  const staff = adminStaff(actor);
  return staff && canDo(staff, action, outlet) ? staff : forbidden;
}

function outletsIn(staff: StaffMember, scope: OutletScope): readonly OutletSlug[] | null {
  if (scope === "all") return staff.outlets;
  return seesOutlet(staff, scope) ? [scope] : null;
}

function log(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  action: AuditAction,
  entity: string,
  extra: { readonly outlet?: OutletSlug; readonly detail?: string } = {},
): void {
  const entry: AuditEntry = {
    at: ctx.now.toISOString(),
    staffId: actor.staffId,
    action,
    entity,
    ...(extra.outlet ? { outlet: extra.outlet } : {}),
    ...(extra.detail ? { detail: extra.detail } : {}),
  };
  db.audit.push(entry);
}

const today = (ctx: EngineContext) => localDate(ctx.now, ctx.timeZone);
const isToday = (iso: string, ctx: EngineContext) => localDate(new Date(iso), ctx.timeZone) === today(ctx);

/* Dashboard */

function slotLoads(db: MockDb, ctx: EngineContext, slug: OutletSlug, date: string): SlotLoad[] {
  const outlet = ctx.outlets.find((o) => o.slug === slug);
  if (!outlet || closedDates(db, slug).includes(date)) return [];
  const settings = settingsOf(db, slug);
  return slotTimes(hoursOf(db, outlet), settings).map((time) => ({
    time,
    taken: seatsTaken(db.bookings, { outlet: slug, date, time }, settings, ctx.now),
    capacity: settings.capacityPerSlot,
  }));
}

const eventOutlet = (ctx: EngineContext, slug: string | undefined) => ctx.events.find((e) => e.slug === slug)?.outlet;

function eventSales(db: MockDb, ctx: EngineContext, event: EventInfo): EventSales {
  const stock = eventAvailability(db, ctx, event.slug);
  const types = stock.ok ? stock.value.ticketTypes : [];
  const tickets = db.tickets.filter((t) => t.eventSlug === event.slug && t.status === "valid");
  return {
    event,
    quota: types.reduce((sum, t) => sum + t.quota, 0),
    sold: types.reduce((sum, t) => sum + (t.quota - t.left), 0),
    checkedIn: tickets.filter((t) => t.checkedInAt).reduce((sum, t) => sum + t.quantity, 0),
    waiting: stock.ok ? stock.value.waitlistLength : 0,
    unpaid: db.orders
      .filter((o) => o.kind === "tickets" && o.eventSlug === event.slug && o.status === "reserved")
      .reduce((sum, o) => sum + o.quantity, 0),
  };
}

const LIVE_ON_DAY: readonly Booking["status"][] = ["requested", "confirmed", "completed", "no_show"];

export function dashboard(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  scope: OutletScope,
): ServiceResult<Dashboard> {
  const staff = opener(actor, "dashboard");
  if (isError(staff)) return err(staff);
  const outlets = outletsIn(staff, scope);
  if (!outlets) return err(forbidden);
  const date = today(ctx);
  const here = (b: Booking) => outlets.includes(b.outlet);

  const todays = db.bookings
    .filter((b) => here(b) && b.date === date && LIVE_ON_DAY.includes(b.status))
    .sort((a, b) => a.time.localeCompare(b.time));
  const seatedToday = db.bookings.filter(
    (b) => here(b) && b.status === "completed" && b.history.some((h) => h.status === "completed" && isToday(h.at, ctx)),
  );
  const ticketsToday = db.tickets.filter((t) => {
    const outlet = eventOutlet(ctx, t.eventSlug);
    return outlet !== undefined && outlets.includes(outlet) && t.checkedInAt !== null && isToday(t.checkedInAt, ctx);
  });
  const paidOnline = db.orders.filter((o) => {
    const outlet =
      o.kind === "tickets" ? eventOutlet(ctx, o.eventSlug) : db.bookings.find((b) => b.code === o.bookingCode)?.outlet;
    return (
      outlet !== undefined &&
      outlets.includes(outlet) &&
      o.method === "online" &&
      o.history.some((h) => h.status === "paid" && isToday(h.at, ctx))
    );
  });
  const single = outlets.length === 1 ? outlets[0] : undefined;

  return ok({
    scope,
    date,
    tables: canOpen(staff, "bookings")
      ? {
          covers: todays
            .filter((b) => b.status === "confirmed" || b.status === "completed")
            .reduce((s, b) => s + b.partySize, 0),
          requests: canDo(staff, "booking.decide")
            ? db.bookings.filter((b) => here(b) && b.status === "requested").length
            : null,
          today: todays,
          slots: single ? slotLoads(db, ctx, single, date) : null,
        }
      : null,
    checkIns: seatedToday.reduce((s, b) => s + b.partySize, 0) + ticketsToday.reduce((s, t) => s + t.quantity, 0),
    onlinePayments: staff.role === "owner" || staff.role === "manager" ? paidOnline.length : null,
    events: canOpen(staff, "events")
      ? ctx.events.filter((e) => outlets.includes(e.outlet)).map((e) => eventSales(db, ctx, e))
      : null,
    wall: canDo(staff, "wall.moderate")
      ? {
          waiting: db.wall.filter((e) => e.status === "pending").length,
          reported: new Set(db.wallReports.map((r) => r.key)).size,
        }
      : null,
    newEnquiries: canDo(staff, "enquiries.update") ? db.enquiries.filter((e) => e.status === "new").length : null,
  });
}

/* Bookings */

function seatsLeftFor(db: MockDb, ctx: EngineContext, booking: Booking): number {
  const settings = settingsOf(db, booking.outlet);
  const taken = seatsTaken(db.bookings, booking, settings, ctx.now, booking.code);
  return Math.max(0, settings.capacityPerSlot - taken);
}

export function listBookings(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  query: BookingQuery,
): ServiceResult<BookingRow[]> {
  const staff = opener(actor, "bookings");
  if (isError(staff)) return err(staff);
  const outlets = outletsIn(staff, query.outlet);
  if (!outlets) return err(forbidden);
  const row = (booking: Booking): BookingRow => ({ booking, seatsLeft: seatsLeftFor(db, ctx, booking) });

  if (query.view === "requests") {
    if (!canDo(staff, "booking.decide")) return err(forbidden);
    return ok(
      db.bookings
        .filter((b) => outlets.includes(b.outlet) && b.status === "requested")
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map(row),
    );
  }
  /* Baristas see today only (Blueprint section 10). */
  if (staff.role === "barista" && query.date !== today(ctx)) return err(forbidden);
  return ok(
    db.bookings
      .filter((b) => outlets.includes(b.outlet) && b.date === query.date && LIVE_ON_DAY.includes(b.status))
      .sort((a, b) => a.time.localeCompare(b.time) || a.code.localeCompare(b.code))
      .map(row),
  );
}

export function decideBooking(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  code: string,
  raw: unknown,
): ServiceResult<Booking> {
  const parsed = bookingDecisionSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const { action, note } = parsed.data;
  const booking = db.bookings.find((b) => b.code === code);
  if (!booking) return err({ code: "not_found" });
  const permission: AdminAction =
    action === "approve" || action === "decline"
      ? "booking.decide"
      : action === "note"
        ? "booking.note"
        : "booking.arrive";
  const staff = doer(actor, permission, booking.outlet);
  if (isError(staff)) return err(staff);
  const where = { outlet: booking.outlet };

  if (action === "note") {
    booking.staffNote = note ?? "";
    log(db, ctx, actor, "booking.note", code, where);
    return ok(booking);
  }

  const event = action === "seat" ? "complete" : action;
  const status = nextStatus(booking.status, event);
  if (!status) return err({ code: "not_allowed" });
  /* A table is seated or marked a no-show on its day, and a no-show only once its time has passed. */
  if ((action === "seat" || action === "no_show") && booking.date !== today(ctx)) return err({ code: "not_allowed" });
  if (action === "no_show" && Date.parse(booking.startsAt) > ctx.now.getTime()) return err({ code: "not_allowed" });

  if (action === "approve") booking.payment ??= "cafe";
  if (note) booking.staffNote = note;
  booking.status = status;
  booking.history.push({ status, at: ctx.now.toISOString() });
  const audit: Record<typeof action, AuditAction> = {
    approve: "booking.approve",
    decline: "booking.decline",
    seat: "booking.seat",
    no_show: "booking.no_show",
  };
  log(db, ctx, actor, audit[action], code, {
    ...where,
    detail: `${booking.partySize} guests, ${booking.date} ${booking.time}`,
  });
  return ok(booking);
}

/* Capacity and hours */

function settingsView(db: MockDb, slug: OutletSlug, ctx: EngineContext): OutletSettingsView {
  const outlet = ctx.outlets.find((o) => o.slug === slug);
  const hours = outlet?.hours ?? { open: "09:00", close: "23:45" };
  const defaults = { ...hours, capacityPerSlot: bookingSettingsFor(slug).capacityPerSlot };
  const saved = db.outletSettings[slug];
  return { slug, settings: saved ?? { ...defaults, blackouts: [] }, defaults, saved: saved !== undefined };
}

export function getSettings(db: MockDb, ctx: EngineContext, actor: AdminActor): ServiceResult<OutletSettingsView[]> {
  const staff = opener(actor, "capacity");
  if (isError(staff)) return err(staff);
  return ok(staff.outlets.map((slug) => settingsView(db, slug, ctx)));
}

function describeChange(before: OutletSettings, after: OutletSettings): string {
  const parts: string[] = [];
  if (before.open !== after.open || before.close !== after.close) {
    parts.push(`hours ${before.open}–${before.close} → ${after.open}–${after.close}`);
  }
  if (before.capacityPerSlot !== after.capacityPerSlot) {
    parts.push(`seats per slot ${before.capacityPerSlot} → ${after.capacityPerSlot}`);
  }
  const was = new Set(before.blackouts.map((b) => b.date));
  const now = new Set(after.blackouts.map((b) => b.date));
  const added = [...now].filter((d) => !was.has(d));
  const removed = [...was].filter((d) => !now.has(d));
  if (added.length) parts.push(`closed ${added.join(", ")}`);
  if (removed.length) parts.push(`reopened ${removed.join(", ")}`);
  return parts.join("; ") || "no change";
}

export function saveSettings(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  slug: OutletSlug,
  raw: unknown,
): ServiceResult<SettingsSaved> {
  const staff = doer(actor, "capacity.edit", slug);
  if (isError(staff)) return err(staff);
  const outlet = ctx.outlets.find((o) => o.slug === slug);
  if (!outlet) return err({ code: "not_found" });
  const parsed = outletSettingsInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const input = parsed.data;
  if (input.open === input.close) return err({ code: "invalid_input", fields: { close: "time.same" } });
  const from = today(ctx);
  const past = input.blackouts.findIndex((b) => b.date < from);
  if (past >= 0) return err({ code: "invalid_input", fields: { [`blackouts.${past}.date`]: "date.past" } });

  const byDate = new Map(input.blackouts.map((b) => [b.date, b]));
  const next: OutletSettings = {
    open: input.open,
    close: input.close,
    capacityPerSlot: input.capacityPerSlot,
    blackouts: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
  const before = settingsView(db, slug, ctx).settings;
  db.outletSettings[slug] = next;

  const times = new Set(slotTimes(next, settingsOf(db, slug)));
  const closed = new Set(next.blackouts.map((b) => b.date));
  const outside = db.bookings.filter(
    (b) =>
      b.outlet === slug &&
      b.status === "confirmed" &&
      Date.parse(b.startsAt) > ctx.now.getTime() &&
      (closed.has(b.date) || !times.has(b.time)),
  ).length;
  log(db, ctx, actor, "settings.update", slug, { outlet: slug, detail: describeChange(before, next) });
  return ok({ view: settingsView(db, slug, ctx), outside });
}

/* Menu */

export const EDITABLE_TAGS = [COLD_BREW_TAG, HOUSE_NAMED_TAG] as const;

const asEdit = (item: MenuItem): MenuEdit => ({
  name: item.name,
  notes: item.notes,
  ...(item.prices ? { prices: item.prices.map((p) => p.paise) } : {}),
  ...(item.steepHours !== undefined ? { steepHours: item.steepHours } : {}),
  tags: [...item.tags],
});

const sameEdit = (a: MenuEdit, b: MenuEdit) => JSON.stringify(a) === JSON.stringify(b);

function shippedPdfAt(ctx: EngineContext): string {
  return zonedInstant(menuDocument.uploadedAt, 0, ctx.timeZone).toISOString();
}

function menuView(db: MockDb, ctx: EngineContext): AdminMenu {
  const { published, drafts, off } = db.menu;
  const pdf = db.menu.pdf
    ? { name: db.menu.pdf.name, bytes: db.menu.pdf.bytes, at: db.menu.pdf.at, shipped: false }
    : {
        name: menuDocument.href.split("/").pop() ?? menuDocument.href,
        bytes: menuDocument.bytes,
        at: shippedPdfAt(ctx),
        shipped: true,
      };
  return {
    categories: baseMenu.categories,
    items: baseMenu.items.map((base) => {
      const edit = published[base.id];
      const draft = drafts[base.id];
      return {
        item: applyEdit(base, edit),
        off: (Object.keys(off) as OutletSlug[]).filter((o) => off[o]?.includes(base.id)),
        ...(draft ? { draft } : {}),
        ...(edit ? { editedAt: edit.at } : {}),
      };
    }),
    pdf,
    changedSincePdf: Object.entries(published)
      .filter(([, edit]) => edit.at > pdf.at)
      .map(([id]) => id),
  };
}

export function getMenu(db: MockDb, ctx: EngineContext, actor: AdminActor): ServiceResult<AdminMenu> {
  const staff = opener(actor, "menu");
  if (isError(staff)) return err(staff);
  return ok(menuView(db, ctx));
}

export function saveDraft(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  itemId: string,
  raw: unknown,
): ServiceResult<AdminMenu> {
  const staff = doer(actor, "menu.edit");
  if (isError(staff)) return err(staff);
  const base = baseMenu.items.find((i) => i.id === itemId);
  if (!base) return err({ code: "not_found" });
  if (raw === null) {
    delete db.menu.drafts[itemId];
    return ok(menuView(db, ctx));
  }
  const parsed = menuEditInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const input = parsed.data;
  /* The shape follows the printed item: one price per serving, steep hours on cold brews only. */
  if ((base.prices?.length ?? 0) !== (input.prices?.length ?? 0)) {
    return err({ code: "invalid_input", fields: { prices: "price.invalid" } });
  }
  if ((base.steepHours === undefined) !== (input.steepHours === undefined)) {
    return err({ code: "invalid_input", fields: { steepHours: "steep.invalid" } });
  }
  if (input.tags.some((t) => !(EDITABLE_TAGS as readonly string[]).includes(t))) {
    return err({ code: "invalid_input", fields: { tags: "tags.invalid" } });
  }
  const edit: MenuEdit = {
    name: input.name,
    notes: input.notes,
    ...(input.prices ? { prices: input.prices } : {}),
    ...(input.steepHours !== undefined ? { steepHours: input.steepHours } : {}),
    tags: EDITABLE_TAGS.filter((t) => input.tags.includes(t)),
  };
  const current = asEdit(applyEdit(base, db.menu.published[itemId]));
  if (sameEdit(edit, current)) delete db.menu.drafts[itemId];
  else db.menu.drafts[itemId] = edit;
  return ok(menuView(db, ctx));
}

export function publishMenu(db: MockDb, ctx: EngineContext, actor: AdminActor): ServiceResult<AdminMenu> {
  const staff = doer(actor, "menu.edit");
  if (isError(staff)) return err(staff);
  const drafts = Object.entries(db.menu.drafts);
  if (drafts.length === 0) return err({ code: "not_allowed" });
  const at = ctx.now.toISOString();
  for (const [id, draft] of drafts) db.menu.published[id] = { ...draft, at, by: actor.staffId };
  db.menu.drafts = {};
  log(db, ctx, actor, "menu.publish", `${drafts.length} ${drafts.length === 1 ? "item" : "items"}`, {
    detail: drafts.map(([, d]) => d.name).join(", "),
  });
  return ok(menuView(db, ctx));
}

export function setAvailability(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  outlet: OutletSlug,
  itemId: string,
  available: boolean,
): ServiceResult<AdminMenu> {
  const staff = doer(actor, "menu.availability", outlet);
  if (isError(staff)) return err(staff);
  const item = baseMenu.items.find((i) => i.id === itemId);
  if (!item) return err({ code: "not_found" });
  const off = new Set(db.menu.off[outlet] ?? []);
  if (available === !off.has(itemId)) return ok(menuView(db, ctx));
  if (available) off.delete(itemId);
  else off.add(itemId);
  db.menu.off[outlet] = [...off];
  log(
    db,
    ctx,
    actor,
    available ? "menu.available" : "menu.unavailable",
    applyEdit(item, db.menu.published[itemId]).name,
    {
      outlet,
    },
  );
  return ok(menuView(db, ctx));
}

export function uploadMenuPdf(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  raw: unknown,
): ServiceResult<AdminMenu> {
  const staff = doer(actor, "menu.edit");
  if (isError(staff)) return err(staff);
  const parsed = pdfInputSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  db.menu.pdf = { name: parsed.data.name, bytes: parsed.data.bytes, at: ctx.now.toISOString(), by: actor.staffId };
  log(db, ctx, actor, "menu.pdf", parsed.data.name, { detail: `${(parsed.data.bytes / 1024 / 1024).toFixed(1)} MB` });
  return ok(menuView(db, ctx));
}

/* Events and attendees */

export function listEvents(db: MockDb, ctx: EngineContext, actor: AdminActor): ServiceResult<EventSales[]> {
  const staff = opener(actor, "events");
  if (isError(staff)) return err(staff);
  return ok(ctx.events.filter((e) => seesOutlet(staff, e.outlet)).map((e) => eventSales(db, ctx, e)));
}

export function attendees(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  slug: string,
): ServiceResult<AttendeeList> {
  const staff = opener(actor, "events");
  if (isError(staff)) return err(staff);
  const event = ctx.events.find((e) => e.slug === slug);
  if (!event) return err({ code: "not_found" });
  if (!seesOutlet(staff, event.outlet)) return err(forbidden);
  const typeName = (id: string | undefined) => event.ticketTypes.find((t) => t.id === id)?.name ?? "";
  const list = db.tickets
    .filter((t) => t.eventSlug === slug)
    .map((ticket) => {
      const order = db.orders.find((o) => o.id === ticket.orderId);
      return {
        code: ticket.code,
        orderId: ticket.orderId,
        name: order?.customer?.name ?? "",
        phoneMasked: order?.customer ? maskIndianMobile(order.customer.phone) : "",
        quantity: ticket.quantity,
        ticketType: typeName(order?.ticketTypeId),
        paid: order?.status === "paid",
        valid: ticket.status === "valid" && (order?.status === "paid" || order?.status === "reserved"),
        checkedInAt: ticket.checkedInAt,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code));
  const sampleSeats = event.ticketTypes.reduce(
    (sum, t) => sum + Math.max(0, t.seedSold - (db.released[`${slug}:${t.id}`] ?? 0)),
    0,
  );
  return ok({ sales: eventSales(db, ctx, event), attendees: list, sampleSeats });
}

function ticketOutlet(db: MockDb, ctx: EngineContext, code: string): OutletSlug | null {
  const ticket = db.tickets.find((t) => t.code === code);
  return (ticket && eventOutlet(ctx, ticket.eventSlug)) ?? null;
}

export function checkIn(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  code: string,
  collected: boolean,
): ServiceResult<DoorView> {
  const outlet = ticketOutlet(db, ctx, code);
  if (!outlet) return err({ code: "not_found" });
  const staff = doer(actor, "events.checkIn", outlet);
  if (isError(staff)) return err(staff);
  return doorCheckIn(db, ctx, { staffId: actor.staffId, outlet }, code, collected);
}

export function markPaid(db: MockDb, ctx: EngineContext, actor: AdminActor, code: string): ServiceResult<DoorView> {
  const outlet = ticketOutlet(db, ctx, code);
  if (!outlet) return err({ code: "not_found" });
  const staff = doer(actor, "events.checkIn", outlet);
  if (isError(staff)) return err(staff);
  const ticket = db.tickets.find((t) => t.code === code);
  const order = ticket && db.orders.find((o) => o.id === ticket.orderId);
  if (!ticket || !order) return err({ code: "not_found" });
  const status = nextOrderStatus(order.status, "settle_at_cafe");
  if (!status || ticket.status !== "valid") return err({ code: "not_allowed" });
  order.status = status;
  order.history.push({ status, at: ctx.now.toISOString() });
  ticket.paid = true;
  log(db, ctx, actor, "order.paid_at_counter", ticket.code, { outlet });
  return ok({ ticket, order, paid: true });
}

/* Book wall */

function queue(db: MockDb): WallQueue {
  const reports = new Map<string, number>();
  for (const r of db.wallReports) reports.set(r.key, (reports.get(r.key) ?? 0) + 1);
  return {
    waiting: db.wall.filter((e) => e.status === "pending").sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    reported: [...reports.entries()].flatMap(([key, count]) => {
      const entries = db.wall.filter((e) => e.key === key && e.status === "approved");
      const first = entries.find((e) => e.kind === "book") ?? entries[0];
      if (!first) return [];
      return [
        {
          key,
          title: first.title,
          author: first.author,
          reports: count,
          lines: entries.filter((e) => e.line).map((e) => e.line),
        },
      ];
    }),
  };
}

export function wallQueue(db: MockDb, actor: AdminActor): ServiceResult<WallQueue> {
  const staff = opener(actor, "wall");
  if (isError(staff)) return err(staff);
  return ok(queue(db));
}

export function moderate(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  entryId: string,
  decision: "approve" | "reject",
): ServiceResult<WallQueue> {
  const staff = doer(actor, "wall.moderate");
  if (isError(staff)) return err(staff);
  const entry = db.wall.find((e) => e.id === entryId);
  if (!entry) return err({ code: "not_found" });
  if (entry.status !== "pending") return err({ code: "not_allowed" });
  entry.status = decision === "approve" ? "approved" : "rejected";
  log(db, ctx, actor, decision === "approve" ? "wall.approve" : "wall.reject", entry.title);
  return ok(queue(db));
}

export function resolveReport(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  key: string,
  decision: "hide" | "keep",
): ServiceResult<WallQueue> {
  const staff = doer(actor, "wall.moderate");
  if (isError(staff)) return err(staff);
  if (!db.wallReports.some((r) => r.key === key)) return err({ code: "not_found" });
  const entries = db.wall.filter((e) => e.key === key && e.status === "approved");
  const title = entries[0]?.title ?? key;
  if (decision === "hide") for (const e of entries) e.status = "rejected";
  db.wallReports = db.wallReports.filter((r) => r.key !== key);
  log(db, ctx, actor, decision === "hide" ? "wall.hide" : "wall.keep", title);
  return ok(queue(db));
}

/* Enquiries */

export function listEnquiries(db: MockDb, actor: AdminActor): ServiceResult<Enquiry[]> {
  const staff = opener(actor, "enquiries");
  if (isError(staff)) return err(staff);
  return ok([...db.enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export function updateEnquiry(
  db: MockDb,
  ctx: EngineContext,
  actor: AdminActor,
  code: string,
  raw: unknown,
): ServiceResult<Enquiry> {
  const staff = doer(actor, "enquiries.update");
  if (isError(staff)) return err(staff);
  const parsed = enquiryUpdateSchema.safeParse(raw);
  if (!parsed.success) return err(invalidInput(parsed.error.issues));
  const enquiry = db.enquiries.find((e) => e.code === code);
  if (!enquiry) return err({ code: "not_found" });
  const before = enquiry.status;
  enquiry.status = parsed.data.status;
  if (parsed.data.note !== undefined) enquiry.note = parsed.data.note;
  log(db, ctx, actor, "enquiry.update", code, {
    ...(enquiry.outlet ? { outlet: enquiry.outlet } : {}),
    detail: before === enquiry.status ? "note" : `${before} → ${enquiry.status}`,
  });
  return ok(enquiry);
}

/* Audit log */

const AUDIT_LIMIT = 300;

export function audit(db: MockDb, actor: AdminActor, scope: OutletScope): ServiceResult<AuditEntry[]> {
  const staff = opener(actor, "audit");
  if (isError(staff)) return err(staff);
  const outlets = outletsIn(staff, scope);
  if (!outlets) return err(forbidden);
  /* Owners also see changes tied to no outlet (menu text, wall, enquiries); managers see their outlet's. */
  const visible = (e: AuditEntry) =>
    e.outlet ? outlets.includes(e.outlet) : staff.role === "owner" && scope === "all";
  return ok(db.audit.filter(visible).reverse().slice(0, AUDIT_LIMIT));
}
