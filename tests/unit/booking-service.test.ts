import { beforeEach, describe, expect, it } from "vitest";
import { fingerprint, runIdempotent, type IdempotencyLedger } from "@/domain/idempotency";
import type { HoldInput } from "@/domain/booking/schema";
import type { BookingService } from "@/services/bookings";
import type { DemoControls } from "@/services/demo";
import { createMockBackend, memoryStore } from "@/services/mock/mockBackend";
import { mockOutlets } from "@/services/mock/outlets";

const IST = "Asia/Kolkata";
let now = new Date("2026-10-10T12:00:00+05:30");
let backend: BookingService;
let demo: DemoControls;

const hold = (over: Partial<HoldInput> = {}): HoldInput => ({
  outlet: "raja-park",
  date: "2026-10-12",
  time: "19:00",
  partySize: 2,
  name: "Test guest",
  phone: "90000 00099",
  note: "",
  whatsappOptIn: true,
  privacyAccepted: true,
  noticeVersion: "draft-0",
  website: "",
  ...over,
});

const minutes = (n: number) => {
  now = new Date(now.getTime() + n * 60_000);
};

beforeEach(() => {
  now = new Date("2026-10-10T12:00:00+05:30");
  let seed = 1;
  ({ bookings: backend, demo } = createMockBackend({
    store: memoryStore(),
    outlets: mockOutlets,
    timeZone: IST,
    clock: () => now,
    random: () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  }));
});

describe("idempotency ledger", () => {
  const write = (value: string) => () => ({ ok: true as const, value });

  it("replays the first response for the same key and request", () => {
    const ledger: IdempotencyLedger<string> = {};
    const t = new Date();
    expect(runIdempotent(ledger, "k", { a: 1, b: 2 }, t, write("first")).kind).toBe("fresh");
    const again = runIdempotent(ledger, "k", { b: 2, a: 1 }, t, write("second"));
    expect(again).toEqual({ kind: "replayed", ok: true, value: "first" });
  });

  it("refuses the same key with a different request", () => {
    const ledger: IdempotencyLedger<string> = {};
    runIdempotent(ledger, "k", { a: 1 }, new Date(), write("first"));
    expect(runIdempotent(ledger, "k", { a: 2 }, new Date(), write("x")).kind).toBe("conflict");
  });

  it("does not remember failures, and forgets keys after a day", () => {
    const ledger: IdempotencyLedger<string> = {};
    const t = new Date("2026-10-10T00:00:00Z");
    runIdempotent(ledger, "k", {}, t, () => ({ ok: false as const, error: "nope" }));
    expect(ledger).toEqual({});
    runIdempotent(ledger, "k", {}, t, write("first"));
    const later = new Date(t.getTime() + 24 * 60 * 60_000 + 1);
    expect(runIdempotent(ledger, "k", { changed: true }, later, write("again")).kind).toBe("fresh");
  });

  it("fingerprints ignore key order", () => {
    expect(fingerprint({ b: { d: 1, c: 2 }, a: [2, 1] })).toBe(fingerprint({ a: [2, 1], b: { c: 2, d: 1 } }));
  });
});

describe("booking a small table", () => {
  it("holds, then confirms with pay at the cafe", async () => {
    const held = await backend.createHold(hold(), "key-1");
    expect(held.ok && held.value.status).toBe("held");
    if (!held.ok) return;
    expect(held.value.code).toMatch(/^CRB-\d{4}$/);
    expect(held.value.phone).toBe("+919000000099");
    expect(held.value.holdExpiresAt).toBe(new Date(now.getTime() + 10 * 60_000).toISOString());
    expect(held.value.startsAt).toBe("2026-10-12T13:30:00.000Z");

    const confirmed = await backend.confirm(held.value.code, { payment: "cafe" }, "key-2");
    expect(confirmed.ok && confirmed.value.status).toBe("confirmed");
    expect(confirmed.ok && confirmed.value.history.map((h) => h.status)).toEqual(["held", "confirmed"]);
  });

  it("a double tap makes one booking", async () => {
    const [a, b] = await Promise.all([backend.createHold(hold(), "same"), backend.createHold(hold(), "same")]);
    expect(a.ok && b.ok && a.value.code === b.value.code).toBe(true);
    const slots = await backend.getAvailability({ outlet: "raja-park", date: "2026-10-12", partySize: 2 });
    expect(slots.ok && slots.value.slots.find((s) => s.time === "19:00")?.remaining).toBe(22);
  });

  it("a retry with a new key but the same phone and slot returns the same booking", async () => {
    const a = await backend.createHold(hold(), "first");
    const b = await backend.createHold(hold({ phone: "+91 90000-00099" }), "second");
    expect(a.ok && b.ok && b.value.code === a.value.code).toBe(true);
  });

  it("refuses a reused key with different details", async () => {
    await backend.createHold(hold(), "k");
    const other = await backend.createHold(hold({ time: "19:30" }), "k");
    expect(!other.ok && other.error.code).toBe("idempotency_conflict");
  });

  it("validates fields and catches the honeypot", async () => {
    const bad = await backend.createHold(hold({ name: " ", phone: "12345" }), "a");
    expect(!bad.ok && bad.error).toEqual({
      code: "invalid_input",
      fields: { name: "name.required", phone: "phone.invalid" },
    });
    const bot = await backend.createHold(hold({ website: "https://spam.example" }), "b");
    expect(!bot.ok && bot.error.code).toBe("bot_check");
    const noConsent = await backend.createHold({ ...hold(), privacyAccepted: false }, "c");
    expect(!noConsent.ok && noConsent.error.fields).toEqual({ privacyAccepted: "privacy.required" });
  });

  it("refuses times inside the lead time and beyond the window", async () => {
    const soon = await backend.createHold(hold({ date: "2026-10-10", time: "12:30" }), "a");
    expect(!soon.ok && soon.error.code).toBe("outside_window");
    const far = await backend.createHold(hold({ date: "2026-11-10" }), "b");
    expect(!far.ok && far.error.code).toBe("outside_window");
    const closed = await backend.createHold(hold({ time: "22:30" }), "c");
    expect(!closed.ok && closed.error.code).toBe("outside_window");
  });
});

describe("the last table", () => {
  it("goes to whoever holds it first; the other gets the next best slots", async () => {
    for (let i = 0; i < 3; i += 1) {
      await backend.createHold(hold({ partySize: 6, phone: `90000 0001${i}` }), `fill-${i}`);
    }
    const [first, second] = await Promise.all([
      backend.createHold(hold({ partySize: 6, phone: "90000 00021" }), "race-a"),
      backend.createHold(hold({ partySize: 6, phone: "90000 00022" }), "race-b"),
    ]);
    expect(first.ok).toBe(true);
    expect(!second.ok && second.error.code).toBe("slot_full");
    expect(!second.ok && second.error.alternatives?.[0]).toEqual({ date: "2026-10-12", time: "17:30" });
  });
});

describe("hold expiry", () => {
  it("releases the seats and refuses to confirm after ten minutes", async () => {
    const held = await backend.createHold(hold({ partySize: 6 }), "a");
    if (!held.ok) throw new Error("hold failed");
    minutes(10);
    const late = await backend.confirm(held.value.code, { payment: "cafe" }, "b");
    expect(!late.ok && late.error.code).toBe("hold_expired");
    const after = await backend.getBooking(held.value.code);
    expect(after.ok && after.value.status).toBe("expired");
    const slots = await backend.getAvailability({ outlet: "raja-park", date: "2026-10-12", partySize: 2 });
    expect(slots.ok && slots.value.slots.find((s) => s.time === "19:00")?.remaining).toBe(24);
  });

  it("confirms just before the hold runs out", async () => {
    const held = await backend.createHold(hold(), "a");
    if (!held.ok) throw new Error("hold failed");
    minutes(9.99);
    expect((await backend.confirm(held.value.code, { payment: "cafe" }, "b")).ok).toBe(true);
  });

  it("cancelling a hold releases the table", async () => {
    const held = await backend.createHold(hold({ partySize: 6 }), "a");
    if (!held.ok) throw new Error("hold failed");
    const released = await backend.cancel(held.value.code, "b");
    expect(released.ok && released.value.status).toBe("expired");
    const slots = await backend.getAvailability({ outlet: "raja-park", date: "2026-10-12", partySize: 2 });
    expect(slots.ok && slots.value.slots.find((s) => s.time === "19:00")?.remaining).toBe(24);
  });

  it("the demo control ends live holds now", async () => {
    await backend.createHold(hold(), "a");
    expect(await demo.expireHolds()).toBe(1);
  });
});

describe("large groups", () => {
  it("send a request that takes no seats until staff approve", async () => {
    const held = await backend.createHold(hold({ partySize: 12 }), "a");
    if (!held.ok) throw new Error("hold failed");
    expect(held.value.kind).toBe("request");
    const confirmAttempt = await backend.confirm(held.value.code, { payment: "cafe" }, "b");
    expect(!confirmAttempt.ok && confirmAttempt.error.code).toBe("not_allowed");

    const sent = await backend.sendRequest(held.value.code, { occasion: "Team dinner", budgetPerHead: "" }, "c");
    expect(sent.ok && sent.value.status).toBe("requested");
    expect(sent.ok && sent.value.request).toEqual({ occasion: "Team dinner", budgetPerHead: "" });
    const slots = await backend.getAvailability({ outlet: "raja-park", date: "2026-10-12", partySize: 12 });
    expect(slots.ok && slots.value.kind).toBe("request");
    expect(slots.ok && slots.value.slots.find((s) => s.time === "19:00")?.remaining).toBe(24);
  });

  it("refuses parties above the form's limit", async () => {
    const big = await backend.createHold(hold({ partySize: 21 }), "a");
    expect(!big.ok && big.error.code).toBe("party_too_large");
  });
});

describe("manage booking", () => {
  const confirmed = async () => {
    const held = await backend.createHold(hold(), "h");
    if (!held.ok) throw new Error("hold failed");
    const done = await backend.confirm(held.value.code, { payment: "cafe" }, "c");
    if (!done.ok) throw new Error("confirm failed");
    return done.value.code;
  };

  it("moves to a free slot, not counting its own seats", async () => {
    const code = await confirmed();
    const moved = await backend.change(code, { date: "2026-10-12", time: "19:30" }, "m");
    expect(moved.ok && moved.value.time).toBe("19:30");
    expect(moved.ok && moved.value.startsAt).toBe("2026-10-12T14:00:00.000Z");
  });

  it("cancels before the cutoff and not after", async () => {
    const code = await confirmed();
    now = new Date("2026-10-12T17:01:00+05:30");
    const tooLate = await backend.cancel(code, "x");
    expect(!tooLate.ok && tooLate.error.code).toBe("cutoff_passed");
    now = new Date("2026-10-12T17:00:00+05:30");
    const cancelled = await backend.cancel(code, "y");
    expect(cancelled.ok && cancelled.value.status).toBe("cancelled");
    const again = await backend.cancel(code, "z");
    expect(!again.ok && again.error.code).toBe("not_allowed");
  });

  it("does not find unknown codes", async () => {
    const missing = await backend.getBooking("CRB-0000");
    expect(!missing.ok && missing.error.code).toBe("not_found");
  });
});

describe("seed data", () => {
  it("makes tomorrow evening at C Scheme busy, with fictional guests", async () => {
    const slots = await backend.getAvailability({ outlet: "c-scheme", date: "2026-10-11", partySize: 2 });
    if (!slots.ok) throw new Error("availability failed");
    const state = (time: string) => slots.value.slots.find((s) => s.time === time)?.state;
    expect(state("18:00")).toBe("open");
    expect(state("18:30")).toBe("low");
    expect(state("19:00")).toBe("full");
    expect(state("20:00")).toBe("full");
    expect(state("20:30")).toBe("open");
  });

  it("reset restores the seed", async () => {
    await backend.createHold(hold(), "a");
    await demo.reset();
    const slots = await backend.getAvailability({ outlet: "raja-park", date: "2026-10-11", partySize: 2 });
    expect(slots.ok && slots.value.slots.find((s) => s.time === "19:00")?.remaining).toBe(19);
  });
});
