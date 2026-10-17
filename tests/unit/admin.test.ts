import { beforeEach, describe, expect, it } from "vitest";
import { canDo, canOpen, sectionsFor } from "@/domain/admin/access";
import { applyOverlay, isOff } from "@/domain/menu/overlay";
import { SAMPLE_STAFF, staffById } from "@/domain/staff";
import { createMockBackend, memoryStore, type MockBackend } from "@/services/mock/mockBackend";
import { baseMenu } from "@/services/mock/menu";
import { mockOutlets } from "@/services/mock/outlets";

const IST = "Asia/Kolkata";
const START = new Date("2026-10-10T12:00:00+05:30");
let now = START;
let mock: MockBackend;
let store = memoryStore();
const later = (minutes: number) => {
  now = new Date(now.getTime() + minutes * 60_000);
};
let keys = 0;
const key = () => `a-${(keys += 1)}`;

const owner = { staffId: "stf-owner" };
const manager = { staffId: "stf-manager-c-scheme" };
const rajaManager = { staffId: "stf-manager-raja-park" };
const barista = { staffId: "stf-barista-c-scheme" };
const marketing = { staffId: "stf-marketing" };

beforeEach(() => {
  now = START;
  store = memoryStore();
  let seed = 5;
  mock = createMockBackend({
    store,
    outlets: mockOutlets,
    timeZone: IST,
    clock: () => now,
    random: () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  });
});

const value = <T>(result: { ok: true; value: T } | { ok: false; error: { code: string } }): T => {
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
};

describe("roles", () => {
  it("follow Blueprint section 10", () => {
    const staff = (id: string) => staffById(id)!;
    expect(sectionsFor(staff("stf-owner"))).toHaveLength(8);
    expect(sectionsFor(staff("stf-barista-c-scheme"))).toEqual(["dashboard", "bookings", "events"]);
    expect(sectionsFor(staff("stf-marketing"))).toEqual(["dashboard", "events", "wall", "enquiries"]);
    expect(canDo(staff("stf-manager-c-scheme"), "menu.availability", "c-scheme")).toBe(true);
    expect(canDo(staff("stf-manager-c-scheme"), "menu.availability", "raja-park")).toBe(false);
    expect(canDo(staff("stf-manager-c-scheme"), "menu.edit")).toBe(false);
    expect(canDo(staff("stf-barista-c-scheme"), "booking.decide", "c-scheme")).toBe(false);
    expect(canOpen(staff("stf-marketing"), "bookings")).toBe(false);
    expect(SAMPLE_STAFF.every((s) => canOpen(s, "dashboard"))).toBe(true);
  });
});

describe("dashboard", () => {
  it("shows today at one outlet, with seats by slot", async () => {
    const d = value(await mock.admin.dashboard(manager, "c-scheme"));
    expect(d.date).toBe("2026-10-10");
    expect(d.tables?.covers).toBe(10);
    expect(d.tables?.requests).toBe(1);
    expect(d.tables?.today.map((b) => b.time)).toEqual(["20:00", "20:30"]);
    const eight = d.tables?.slots?.find((s) => s.time === "20:00");
    expect(eight).toEqual({ time: "20:00", taken: 10, capacity: 24 });
    expect(d.wall).toBeNull();
    expect(d.newEnquiries).toBeNull();
  });

  it("keeps each role to its own outlets and sections", async () => {
    expect((await mock.admin.dashboard(manager, "raja-park")).ok).toBe(false);
    const b = value(await mock.admin.dashboard(barista, "all"));
    expect(b.tables?.requests).toBeNull();
    expect(b.onlinePayments).toBeNull();
    const m = value(await mock.admin.dashboard(marketing, "all"));
    expect(m.tables).toBeNull();
    expect(m.wall).toEqual({ waiting: 0, reported: 0 });
    const o = value(await mock.admin.dashboard(owner, "all"));
    expect(o.tables?.requests).toBe(2);
    expect(o.tables?.slots).toBeNull();
  });
});

describe("bookings", () => {
  const requested = async () => value(await mock.admin.listBookings(owner, { view: "requests", outlet: "all" }));

  it("approving a request confirms it, takes its seats and is logged", async () => {
    const [row] = await requested();
    expect(row?.booking.outlet).toBe("c-scheme");
    expect(row?.seatsLeft).toBe(24);
    const done = value(await mock.admin.decideBooking(manager, row!.booking.code, { action: "approve" }, key()));
    expect(done).toMatchObject({ status: "confirmed", payment: "cafe" });
    const slots = value(
      await mock.bookings.getAvailability({ outlet: "c-scheme", date: row!.booking.date, partySize: 2 }),
    ).slots;
    expect(slots.find((s) => s.time === "19:00")?.remaining).toBe(12);
    const log = value(await mock.admin.audit(owner, "all"));
    expect(log[0]).toMatchObject({ staffId: manager.staffId, action: "booking.approve", outlet: "c-scheme" });
    const again = await mock.admin.decideBooking(manager, row!.booking.code, { action: "decline" }, key());
    expect(!again.ok && again.error.code).toBe("not_allowed");
  });

  it("refuses other outlets and other roles", async () => {
    const rows = await requested();
    const raja = rows.find((r) => r.booking.outlet === "raja-park")!;
    const fromCScheme = await mock.admin.decideBooking(manager, raja.booking.code, { action: "approve" }, key());
    expect(!fromCScheme.ok && fromCScheme.error.code).toBe("forbidden");
    const fromBarista = await mock.admin.decideBooking(barista, rows[0]!.booking.code, { action: "decline" }, key());
    expect(!fromBarista.ok && fromBarista.error.code).toBe("forbidden");
    expect((await mock.admin.decideBooking(rajaManager, raja.booking.code, { action: "decline" }, key())).ok).toBe(
      true,
    );
    const list = value(await mock.admin.listBookings(manager, { view: "requests", outlet: "all" }));
    expect(list.every((r) => r.booking.outlet === "c-scheme")).toBe(true);
  });

  it("baristas see today only; seating and no-shows happen on the day", async () => {
    const tomorrow = await mock.admin.listBookings(barista, { view: "day", outlet: "c-scheme", date: "2026-10-11" });
    expect(!tomorrow.ok && tomorrow.error.code).toBe("forbidden");
    const [first] = value(
      await mock.admin.listBookings(barista, { view: "day", outlet: "c-scheme", date: "2026-10-10" }),
    );
    const early = await mock.admin.decideBooking(barista, first!.booking.code, { action: "no_show" }, key());
    expect(!early.ok && early.error.code).toBe("not_allowed");
    const seated = value(await mock.admin.decideBooking(barista, first!.booking.code, { action: "seat" }, key()));
    expect(seated.status).toBe("completed");
    expect(value(await mock.admin.dashboard(barista, "c-scheme")).checkIns).toBe(4);
    const later = value(await mock.admin.listBookings(owner, { view: "day", outlet: "c-scheme", date: "2026-10-11" }));
    const notToday = await mock.admin.decideBooking(owner, later[0]!.booking.code, { action: "seat" }, key());
    expect(!notToday.ok && notToday.error.code).toBe("not_allowed");
  });

  it("keeps a staff note, and a double tap acts once", async () => {
    const [row] = await requested();
    const k = key();
    const a = await mock.admin.decideBooking(owner, row!.booking.code, { action: "note", note: "Window side" }, k);
    expect(
      await mock.admin.decideBooking(owner, row!.booking.code, { action: "note", note: "Window side" }, k),
    ).toEqual(a);
    expect(value(a).staffNote).toBe("Window side");
  });
});

describe("capacity and hours", () => {
  const input = {
    open: "09:00",
    close: "23:45",
    capacityPerSlot: 24,
    blackouts: [] as { date: string; note: string }[],
  };

  it("fewer seats per slot shows in availability at once", async () => {
    value(await mock.admin.saveSettings(manager, "c-scheme", { ...input, capacityPerSlot: 12 }, key()));
    const slots = value(
      await mock.bookings.getAvailability({ outlet: "c-scheme", date: "2026-10-10", partySize: 2 }),
    ).slots;
    expect(slots.find((s) => s.time === "20:00")?.remaining).toBe(2);
    expect(slots.find((s) => s.time === "13:00")?.remaining).toBe(12);
  });

  it("a closed date takes no bookings, and bookings already there are counted", async () => {
    const saved = value(
      await mock.admin.saveSettings(
        manager,
        "c-scheme",
        { ...input, blackouts: [{ date: "2026-10-11", note: "Festival" }] },
        key(),
      ),
    );
    expect(saved.outside).toBe(5);
    const day = value(await mock.bookings.getAvailability({ outlet: "c-scheme", date: "2026-10-11", partySize: 2 }));
    expect(day).toMatchObject({ closed: true, slots: [] });
    const hold = await mock.bookings.createHold(
      {
        outlet: "c-scheme",
        date: "2026-10-11",
        time: "12:00",
        partySize: 2,
        name: "Test guest",
        phone: "90000 00066",
        note: "",
        whatsappOptIn: false,
        privacyAccepted: true,
        noticeVersion: "draft-0",
        website: "",
      },
      key(),
    );
    expect(!hold.ok && hold.error.code).toBe("outside_window");
  });

  it("shorter hours drop the late slots; the change is logged with what changed", async () => {
    const saved = value(await mock.admin.saveSettings(owner, "c-scheme", { ...input, close: "20:00" }, key()));
    expect(saved.outside).toBe(7);
    const slots = value(
      await mock.bookings.getAvailability({ outlet: "c-scheme", date: "2026-10-12", partySize: 2 }),
    ).slots;
    expect(slots.at(-1)?.time).toBe("18:30");
    expect(value(await mock.admin.audit(owner, "c-scheme"))[0]?.detail).toBe("hours 09:00–23:45 → 09:00–20:00");
  });

  it("checks the input and the outlet", async () => {
    const bad = await mock.admin.saveSettings(
      manager,
      "c-scheme",
      { open: "9am", close: "09:00", capacityPerSlot: 0, blackouts: [] },
      key(),
    );
    expect(!bad.ok && bad.error.fields).toEqual({ open: "time.invalid", capacityPerSlot: "capacity.invalid" });
    const past = await mock.admin.saveSettings(
      manager,
      "c-scheme",
      { ...input, blackouts: [{ date: "2026-10-01", note: "" }] },
      key(),
    );
    expect(!past.ok && past.error.fields).toEqual({ "blackouts.0.date": "date.past" });
    const other = await mock.admin.saveSettings(manager, "raja-park", input, key());
    expect(!other.ok && other.error.code).toBe("forbidden");
  });
});

describe("menu", () => {
  const brew = baseMenu.items.find((i) => i.steepHours !== undefined)!;
  const edit = (over: Record<string, unknown> = {}) => ({
    name: brew.name,
    notes: brew.notes,
    prices: brew.prices?.map((p) => (p.paise / 100).toFixed(2)),
    steepHours: brew.steepHours,
    tags: brew.tags,
    ...over,
  });

  it("a draft changes nothing public until published", async () => {
    const menu = value(await mock.admin.saveDraft(owner, brew.id, edit({ prices: ["310"] }), key()));
    expect(menu.items.find((i) => i.item.id === brew.id)?.draft?.prices).toEqual([31000]);
    expect(menu.items.find((i) => i.item.id === brew.id)?.item.prices?.[0]?.paise).toBe(brew.prices?.[0]?.paise);
    const published = value(await mock.admin.publishMenu(owner, key()));
    const item = published.items.find((i) => i.item.id === brew.id)!;
    expect(item.item.prices?.[0]?.paise).toBe(31000);
    expect(item.draft).toBeUndefined();
    expect(published.changedSincePdf).toEqual([brew.id]);
    const nothing = await mock.admin.publishMenu(owner, key());
    expect(!nothing.ok && nothing.error.code).toBe("not_allowed");
  });

  it("a draft that matches what is live is dropped", async () => {
    value(await mock.admin.saveDraft(owner, brew.id, edit({ notes: "Changed" }), key()));
    const back = value(await mock.admin.saveDraft(owner, brew.id, edit(), key()));
    expect(back.items.some((i) => i.draft)).toBe(false);
  });

  it("keeps the printed shape: one price per serving, steep hours on cold brews", async () => {
    const two = await mock.admin.saveDraft(owner, brew.id, edit({ prices: ["300", "320"] }), key());
    expect(!two.ok && two.error.fields).toEqual({ prices: "price.invalid" });
    const words = await mock.admin.saveDraft(owner, brew.id, edit({ prices: ["three hundred"] }), key());
    expect(!words.ok && words.error.fields).toEqual({ "prices.0": "price.invalid" });
    const tag = await mock.admin.saveDraft(owner, brew.id, edit({ tags: ["vegan"] }), key());
    expect(!tag.ok && tag.error.fields).toEqual({ tags: "tags.invalid" });
    const manage = await mock.admin.saveDraft(manager, brew.id, edit(), key());
    expect(!manage.ok && manage.error.code).toBe("forbidden");
  });

  it("the sold-out switch is live at once, per outlet", async () => {
    const menu = value(await mock.admin.setAvailability(manager, "c-scheme", brew.id, false, key()));
    expect(menu.items.find((i) => i.item.id === brew.id)?.off).toEqual(["c-scheme"]);
    const other = await mock.admin.setAvailability(manager, "raja-park", brew.id, false, key());
    expect(!other.ok && other.error.code).toBe("forbidden");
    const overlay = { published: {}, off: { "c-scheme": [brew.id] } };
    expect(isOff(overlay.off, brew.id, "c-scheme")).toBe(true);
    expect(isOff(overlay.off, brew.id, "raja-park")).toBe(false);
    expect(isOff(overlay.off, brew.id, null)).toBe(false);
    const shown = applyOverlay(baseMenu, overlay, "c-scheme").items.find((i) => i.id === brew.id);
    expect(shown?.available).toBe(false);
  });

  it("a new PDF clears the warning; the upload checks the file", async () => {
    value(await mock.admin.saveDraft(owner, brew.id, edit({ notes: "New notes" }), key()));
    value(await mock.admin.publishMenu(owner, key()));
    later(5);
    const pdf = { name: "menu-october.pdf", bytes: 2_000_000, header: "%PDF-1.7" };
    const menu = value(await mock.admin.uploadMenuPdf(owner, pdf, key()));
    expect(menu.pdf).toMatchObject({ name: "menu-october.pdf", shipped: false });
    expect(menu.changedSincePdf).toEqual([]);
    const notPdf = await mock.admin.uploadMenuPdf(owner, { ...pdf, header: "\u0089PNG" }, key());
    expect(!notPdf.ok && notPdf.error.fields).toEqual({ header: "pdf.type" });
    const big = await mock.admin.uploadMenuPdf(owner, { ...pdf, bytes: 11 * 1024 * 1024 }, key());
    expect(!big.ok && big.error.fields).toEqual({ bytes: "pdf.large" });
  });
});

describe("events and attendees", () => {
  const consent = { privacyAccepted: true, noticeVersion: "draft-0", website: "" };
  const buyAtCafe = async () => {
    const order = value(
      await mock.ticketing.createOrder({ eventSlug: "coffee-rave", ticketTypeId: "general", quantity: 2 }, key()),
    );
    const done = value(
      await mock.ticketing.checkout(
        order.id,
        { method: "cafe", customer: { name: "Test guest", phone: "90000 00055", whatsappOptIn: false, ...consent } },
        key(),
      ),
    );
    return done.ticket!;
  };

  it("lists attendees with payment, takes payment at the counter and checks in", async () => {
    const ticket = await buyAtCafe();
    const list = value(await mock.admin.attendees(manager, "coffee-rave"));
    expect(list.sales).toMatchObject({ sold: 35, quota: 40, unpaid: 2 });
    expect(list.sampleSeats).toBe(33);
    expect(list.attendees).toEqual([
      expect.objectContaining({ code: ticket.code, name: "Test guest", paid: false, valid: true, quantity: 2 }),
    ]);
    const paid = value(await mock.admin.markPaid(barista, ticket.code, key()));
    expect(paid.order.status).toBe("paid");
    const twice = await mock.admin.markPaid(barista, ticket.code, key());
    expect(!twice.ok && twice.error.code).toBe("not_allowed");
    value(await mock.admin.checkIn(barista, ticket.code, false, key()));
    expect(value(await mock.admin.attendees(owner, "coffee-rave")).sales.checkedIn).toBe(2);
  });

  it("keeps managers and marketing to what they may do", async () => {
    const ticket = await buyAtCafe();
    expect(value(await mock.admin.listEvents(manager)).map((e) => e.event.slug)).toEqual(["coffee-rave"]);
    const away = await mock.admin.attendees(rajaManager, "coffee-rave");
    expect(!away.ok && away.error.code).toBe("forbidden");
    expect(value(await mock.admin.attendees(marketing, "coffee-rave")).attendees).toHaveLength(1);
    const noDoor = await mock.admin.checkIn(marketing, ticket.code, true, key());
    expect(!noDoor.ok && noDoor.error.code).toBe("forbidden");
  });
});

describe("wall and enquiries", () => {
  it("approves, rejects, and hides a reported spine", async () => {
    const book = {
      title: "Rain in the Hills",
      author: "A. Writer",
      line: "",
      handle: "",
      showName: false,
      website: "",
      openedAt: now.getTime() - 20_000,
    };
    value(await mock.wall.submit(book, key()));
    value(await mock.wall.submit({ ...book, title: "Second" }, key()));
    const queue = value(await mock.admin.wallQueue(marketing));
    expect(queue.waiting.map((e) => e.title)).toEqual(["Rain in the Hills", "Second"]);
    value(await mock.admin.moderate(marketing, queue.waiting[0]!.id, "approve", key()));
    const after = value(await mock.admin.moderate(marketing, queue.waiting[1]!.id, "reject", key()));
    expect(after.waiting).toEqual([]);
    const shelf = value(await mock.wall.getShelf());
    expect(shelf.spines.some((s) => s.title === "Rain in the Hills")).toBe(true);
    expect(shelf.spines.some((s) => s.title === "Second")).toBe(false);

    const target = shelf.spines[0]!;
    value(await mock.wall.report(target.key, key()));
    expect(value(await mock.admin.wallQueue(owner)).reported).toEqual([
      expect.objectContaining({ key: target.key, reports: 1 }),
    ]);
    value(await mock.admin.resolveReport(marketing, target.key, "hide", key()));
    expect(value(await mock.wall.getShelf()).spines.some((s) => s.key === target.key)).toBe(false);
    const manage = await mock.admin.wallQueue(manager);
    expect(!manage.ok && manage.error.code).toBe("forbidden");
  });

  it("moves an enquiry along and logs it", async () => {
    const sent = value(
      await mock.enquiries.submit(
        {
          type: "catering",
          name: "Test guest",
          phone: "90000 00044",
          outlet: "c-scheme",
          date: "",
          guests: "",
          details: "Office party with a cold brew bar.",
          whatsappOptIn: false,
          privacyAccepted: true,
          noticeVersion: "draft-0",
          website: "",
        },
        key(),
      ),
    );
    expect(value(await mock.admin.listEnquiries(marketing)).map((e) => e.code)).toEqual([sent.code]);
    const done = value(
      await mock.admin.updateEnquiry(marketing, sent.code, { status: "replied", note: "Sent options" }, key()),
    );
    expect(done).toMatchObject({ status: "replied", note: "Sent options" });
    expect(value(await mock.admin.audit(owner, "all"))[0]).toMatchObject({
      action: "enquiry.update",
      detail: "new → replied",
    });
    const barred = await mock.admin.listEnquiries(manager);
    expect(!barred.ok && barred.error.code).toBe("forbidden");
  });
});

describe("audit log", () => {
  it("managers see their outlet's entries only", async () => {
    const rows = value(await mock.admin.listBookings(owner, { view: "requests", outlet: "all" }));
    for (const r of rows)
      value(await mock.admin.decideBooking(owner, r.booking.code, { action: "note", note: "x" }, key()));
    const mine = value(await mock.admin.audit(manager, "all"));
    expect(mine.map((e) => e.outlet)).toEqual(["c-scheme"]);
    expect(value(await mock.admin.audit(owner, "all"))).toHaveLength(2);
    const stranger = await mock.admin.audit(barista, "all");
    expect(!stranger.ok && stranger.error.code).toBe("forbidden");
  });

  it("older saved data without the admin tables still loads", async () => {
    await mock.admin.dashboard(owner, "all");
    const saved = store.read()!;
    const older: Partial<typeof saved> = { ...saved };
    delete older.outletSettings;
    delete older.menu;
    store.write(older as typeof saved);
    expect((await mock.admin.getMenu(owner)).ok).toBe(true);
  });
});

describe("admin routes", () => {
  it("need a staff account, and answer like the service", async () => {
    const { GET } = await import("@/app/api/admin/dashboard/route");
    expect((await GET(new Request("http://test/api/admin/dashboard"))).status).toBe(403);
    const res = await GET(
      new Request("http://test/api/admin/dashboard?outlet=c-scheme", { headers: { "x-demo-staff": "stf-owner" } }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; value: { scope: string } };
    expect(body.value.scope).toBe("c-scheme");
    const { GET: bookings } = await import("@/app/api/admin/bookings/route");
    const marketingRes = await bookings(
      new Request("http://test/api/admin/bookings?view=requests", { headers: { "x-demo-staff": "stf-marketing" } }),
    );
    expect(marketingRes.status).toBe(403);
  });
});
