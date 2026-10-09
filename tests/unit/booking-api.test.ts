import { describe, expect, it } from "vitest";
import { GET as availability } from "@/app/api/availability/route";
import { POST as cancel } from "@/app/api/bookings/[code]/cancel/route";
import { POST as confirm } from "@/app/api/bookings/[code]/confirm/route";
import { GET as getBooking } from "@/app/api/bookings/[code]/route";
import { POST as createHold } from "@/app/api/bookings/route";
import { addDays, localDate } from "@/domain/time";

const day = addDays(localDate(new Date(), "Asia/Kolkata"), 5);
const body = {
  outlet: "vaishali-nagar",
  date: day,
  time: "15:00",
  partySize: 3,
  name: "Test guest",
  phone: "9000000088",
  note: "",
  whatsappOptIn: false,
  privacyAccepted: true,
  noticeVersion: "draft-0",
  website: "",
};

const post = (url: string, payload: unknown, key?: string) =>
  new Request(`http://test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(key ? { "idempotency-key": key } : {}) },
    body: JSON.stringify(payload),
  });
const params = (code: string) => ({ params: Promise.resolve({ code }) });

describe("booking route handlers", () => {
  it("lists slots for an outlet, date and party size", async () => {
    const response = await availability(
      new Request(`http://test/api/availability?outlet=vaishali-nagar&date=${day}&partySize=2`),
    );
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.value.slots[0]).toEqual({ time: "09:00", remaining: 24, state: "open" });
  });

  it("rejects a bad query with 400", async () => {
    const response = await availability(new Request("http://test/api/availability?outlet=mumbai"));
    expect(response.status).toBe(400);
  });

  it("requires an idempotency key on writes", async () => {
    const response = await createHold(post("/api/bookings", body));
    expect(response.status).toBe(400);
  });

  it("holds (201), replays the same key, confirms and cancels", async () => {
    const first = await createHold(post("/api/bookings", body, "api-1"));
    expect(first.status).toBe(201);
    const { value: held } = await first.json();
    const replay = await (await createHold(post("/api/bookings", body, "api-1"))).json();
    expect(replay.value.code).toBe(held.code);

    const confirmed = await confirm(
      post(`/api/bookings/${held.code}/confirm`, { payment: "cafe" }, "api-2"),
      params(held.code),
    );
    expect((await confirmed.json()).value.status).toBe("confirmed");

    const fetched = await getBooking(new Request(`http://test/api/bookings/${held.code}`), params(held.code));
    expect((await fetched.json()).value.status).toBe("confirmed");

    const cancelled = await cancel(post(`/api/bookings/${held.code}/cancel`, {}, "api-3"), params(held.code));
    expect((await cancelled.json()).value.status).toBe("cancelled");
  });

  it("maps errors to HTTP statuses", async () => {
    const missing = await getBooking(new Request("http://test/api/bookings/CRB-0000"), params("CRB-0000"));
    expect(missing.status).toBe(404);
    const reused = await createHold(post("/api/bookings", { ...body, time: "16:00" }, "api-1"));
    expect(reused.status).toBe(422);
  });
});
