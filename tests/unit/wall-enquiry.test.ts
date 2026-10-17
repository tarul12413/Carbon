import { beforeEach, describe, expect, it } from "vitest";
import { hasProfanity } from "@/domain/wall/profanity";
import { spineShape, titleKey } from "@/domain/wall/spine";
import type { WallInput } from "@/domain/wall/schema";
import type { EnquiryInput } from "@/domain/enquiry/schema";
import { createMockBackend, memoryStore, type MockBackend } from "@/services/mock/mockBackend";
import { mockOutlets } from "@/services/mock/outlets";

const START = new Date("2026-10-10T12:00:00+05:30");
let now = START;
let mock: MockBackend;
let keys = 0;
const key = () => `k-${(keys += 1)}`;
const later = (minutes: number) => {
  now = new Date(now.getTime() + minutes * 60_000);
};

beforeEach(() => {
  now = START;
  let seed = 3;
  mock = createMockBackend({
    store: memoryStore(),
    outlets: mockOutlets,
    timeZone: "Asia/Kolkata",
    clock: () => now,
    random: () => (seed = (seed * 16807) % 2147483647) / 2147483647,
  });
});

const book = (over: Partial<WallInput> = {}): WallInput => ({
  title: "Rain in the Hills",
  author: "A. Writer",
  line: "Read it in one go.",
  handle: "Asha",
  showName: true,
  website: "",
  openedAt: now.getTime() - 20_000,
  ...over,
});

const marketing = { staffId: "stf-marketing" };
const approveAll = async () => {
  const q = await mock.admin.wallQueue(marketing);
  if (!q.ok) throw new Error();
  for (const e of q.value.waiting) await mock.admin.moderate(marketing, e.id, "approve", key());
  return q.value.waiting.length;
};

const shelf = async () => {
  const s = await mock.wall.getShelf();
  if (!s.ok) throw new Error();
  return s.value;
};

describe("spines", () => {
  it("merge titles that differ only in case, accents, punctuation or a leading article", () => {
    expect(titleKey("The God of Small Things")).toBe(titleKey("god of small things!"));
    expect(titleKey("  Café  Society ")).toBe(titleKey("cafe society"));
    expect(titleKey("Kafka on the Shore")).not.toBe(titleKey("Kafka"));
    expect(titleKey("गीतांजलि")).not.toBe("");
  });

  it("look the same every time, within the shelf's bounds", () => {
    const a = spineShape(titleKey("Malgudi Days"));
    expect(spineShape(titleKey("malgudi days"))).toEqual(a);
    for (const t of ["A", "Siddhartha", "The Palace of Illusions", "x".repeat(80)]) {
      const s = spineShape(titleKey(t));
      expect(s.height).toBeGreaterThanOrEqual(0.62);
      expect(s.height).toBeLessThanOrEqual(1);
      expect(s.width).toBeGreaterThanOrEqual(2.25);
      expect(s.width).toBeLessThanOrEqual(3.5);
      expect(Math.abs(s.tilt)).toBeLessThanOrEqual(6);
    }
  });
});

describe("profanity filter", () => {
  it("catches obvious words and letter swaps", () => {
    expect(hasProfanity("what the f*ck")).toBe(true);
    expect(hasProfanity("sh1t book")).toBe(true);
    expect(hasProfanity("Bhosdike")).toBe(true);
  });

  it("lets real titles through", () => {
    expect(hasProfanity("Moby Dick", "Herman Melville")).toBe(false);
    expect(hasProfanity("The Bastard of Istanbul")).toBe(false);
    expect(hasProfanity("A Scunthorpe Story")).toBe(false);
    expect(hasProfanity("Class Act", "Assam Diaries")).toBe(false);
  });
});

describe("book wall", () => {
  it("starts with the sample shelf, merged by title", async () => {
    const s = await shelf();
    expect(s.spines.length).toBe(16);
    const malgudi = s.spines.find((sp) => sp.title === "Malgudi Days");
    expect(malgudi?.readers).toBe(3);
    expect(malgudi?.lines).toContainEqual({ line: "Short stories, one per cold brew.", name: "Sample reader A" });
    expect(s.readers).toBe(22);
  });

  it("holds a new book until staff approve it, then merges duplicates", async () => {
    const sent = await mock.wall.submit(book(), key());
    expect(sent.ok && sent.value.status).toBe("pending");
    expect((await shelf()).waiting).toBe(1);
    expect((await shelf()).spines.some((s) => s.title === "Rain in the Hills")).toBe(false);

    later(10);
    await mock.wall.submit(book({ title: "rain in the hills.", line: "", handle: "", showName: false }), key());
    expect(await approveAll()).toBe(2);
    const spine = (await shelf()).spines.find((s) => s.key === titleKey("Rain in the Hills"));
    expect(spine).toMatchObject({
      title: "Rain in the Hills",
      readers: 2,
      lines: [{ line: "Read it in one go.", name: "Asha" }],
    });
  });

  it("shows a name only with consent", async () => {
    await mock.wall.submit(book({ showName: false }), key());
    await approveAll();
    const spine = (await shelf()).spines.find((s) => s.title === "Rain in the Hills");
    expect(spine?.lines).toEqual([{ line: "Read it in one go." }]);
  });

  it("checks lengths, the honeypot, the time trap and the profanity filter", async () => {
    const long = await mock.wall.submit(book({ title: "x".repeat(81), author: "" }), key());
    expect(!long.ok && long.error.fields).toEqual({ title: "title.long", author: "author.required" });
    const bot = await mock.wall.submit(book({ website: "spam" }), key());
    expect(!bot.ok && bot.error.code).toBe("bot_check");
    const fast = await mock.wall.submit(book({ openedAt: now.getTime() - 1000 }), key());
    expect(!fast.ok && fast.error.code).toBe("bot_check");
    const rude = await mock.wall.submit(book({ line: "total sh1t" }), key());
    expect(!rude.ok && rude.error.fields).toEqual({ _: "profanity" });
  });

  it("a double tap sends once, and the hourly limit holds", async () => {
    const first = await mock.wall.submit(book(), "same");
    expect(await mock.wall.submit(book(), "same")).toEqual(first);
    expect(await mock.wall.submit(book(), key())).toEqual(first);
    await mock.wall.submit(book({ title: "Two" }), key());
    await mock.wall.submit(book({ title: "Three" }), key());
    const fourth = await mock.wall.submit(book({ title: "Four" }), key());
    expect(!fourth.ok && fourth.error.code).toBe("rate_limited");
    later(61);
    expect((await mock.wall.submit(book({ title: "Four", openedAt: now.getTime() - 9000 }), key())).ok).toBe(true);
  });

  it("'I read this too' adds a reader; reports are recorded", async () => {
    const key0 = titleKey("Siddhartha");
    const added = await mock.wall.addReader(key0, key());
    expect(added.ok && added.value.readers).toBe(2);
    expect((await mock.wall.report(key0, key())).ok).toBe(true);
    const missing = await mock.wall.addReader("no such book", key());
    expect(!missing.ok && missing.error.code).toBe("not_found");
  });
});

describe("enquiries", () => {
  const enquiry = (over: Partial<EnquiryInput> = {}): EnquiryInput => ({
    type: "catering",
    name: "Test guest",
    phone: "90000 00095",
    outlet: "",
    date: "2026-11-02",
    guests: "80",
    details: "Office party, cold brew bar for the evening.",
    whatsappOptIn: true,
    privacyAccepted: true,
    noticeVersion: "draft-0",
    website: "",
    ...over,
  });

  it("files an enquiry with a reference", async () => {
    const result = await mock.enquiries.submit(enquiry(), key());
    expect(result.ok && result.value).toMatchObject({
      type: "catering",
      guests: 80,
      phone: "+919000000095",
      status: "new",
    });
    expect(result.ok && result.value.code).toMatch(/^ENQ-\d{4}$/);
    expect(result.ok && "outlet" in result.value).toBe(false);
  });

  it("checks the details", async () => {
    const bad = await mock.enquiries.submit(
      enquiry({
        type: "party" as "other",
        phone: "123",
        details: "hi",
        privacyAccepted: false,
        guests: "0",
        date: "2026-10-01",
      }),
      key(),
    );
    expect(!bad.ok && bad.error.fields).toEqual({
      type: "type.required",
      phone: "phone.invalid",
      details: "details.short",
      privacyAccepted: "privacy.required",
      guests: "guests.invalid",
    });
    const past = await mock.enquiries.submit(enquiry({ date: "2026-10-01" }), key());
    expect(!past.ok && past.error.fields).toEqual({ date: "date.past" });
  });

  it("a repeat within five minutes returns the first", async () => {
    const first = await mock.enquiries.submit(enquiry(), key());
    later(2);
    expect(await mock.enquiries.submit(enquiry(), key())).toEqual(first);
  });
});

describe("wall and enquiry routes", () => {
  const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
    new Request(`http://test${url}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(payload),
    });

  it("need an idempotency key and answer like the service", async () => {
    const { GET, POST } = await import("@/app/api/wall/route");
    const { POST: enquire } = await import("@/app/api/enquiries/route");
    expect((await GET()).status).toBe(200);
    expect((await POST(post("/api/wall", {}))).status).toBe(400);
    const sent = await POST(
      post(
        "/api/wall",
        { title: "Route Book", author: "R", line: "", handle: "", showName: false, website: "", openedAt: 0 },
        { "idempotency-key": "w-1" },
      ),
    );
    expect(sent.status).toBe(201);
    const bad = await enquire(post("/api/enquiries", { type: "catering" }, { "idempotency-key": "e-1" }));
    expect(bad.status).toBe(400);
  });
});

describe("legal pages", () => {
  it("only use placeholders that exist", async () => {
    const { copy } = await import("@/content/copy");
    const { placeholders } = await import("@/config/placeholders");
    const text = JSON.stringify(copy.legal);
    const keys = [...text.matchAll(/\[\[(\w+)\]\]/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(5);
    for (const k of keys) expect(Object.keys(placeholders)).toContain(k);
  });
});
