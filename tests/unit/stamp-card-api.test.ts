import { afterEach, describe, expect, it, vi } from "vitest";

const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });

const staff = { "x-demo-staff": "stf-barista-c-scheme", "x-demo-outlet": "c-scheme" };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("stamp card routes", () => {
  it("do not exist while the flag is off", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_STAMP_CARD", "false");
    const { POST } = await import("@/app/api/auth/otp/request/route");
    const { GET } = await import("@/app/api/me/route");
    const request = post("/api/auth/otp/request", {}, { "idempotency-key": "k" });
    expect((await POST(request)).status).toBe(404);
    expect((await GET(new Request("http://test/api/me"))).status).toBe(404);
  });

  it("sign in with a code, keep the session in an HTTP-only cookie, and sign out", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_STAMP_CARD", "true");
    const { POST: requestOtp } = await import("@/app/api/auth/otp/request/route");
    const { POST: verifyOtp } = await import("@/app/api/auth/otp/verify/route");
    const { GET: me } = await import("@/app/api/me/route");
    const { GET: qr } = await import("@/app/api/me/qr/route");
    const { POST: signOut } = await import("@/app/api/auth/signout/route");

    const sent = await requestOtp(
      post(
        "/api/auth/otp/request",
        { phone: "90000 00091", privacyAccepted: true, noticeVersion: "draft-0", website: "" },
        { "idempotency-key": "otp-1" },
      ),
    );
    expect(sent.status).toBe(201);
    const { value } = (await sent.json()) as { value: { challengeId: string; demoCode: string } };

    const wrong = await verifyOtp(
      post("/api/auth/otp/verify", { challengeId: value.challengeId, code: "000000" }, { "idempotency-key": "v-0" }),
    );
    expect(wrong.status).toBe(400);
    expect(await wrong.json()).toMatchObject({ error: { code: "otp_invalid", attemptsLeft: 4 } });

    const verified = await verifyOtp(
      post(
        "/api/auth/otp/verify",
        { challengeId: value.challengeId, code: value.demoCode },
        { "idempotency-key": "v-1" },
      ),
    );
    const cookie = verified.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^carbon_session=ses_[a-z0-9]{10}; Path=\/; HttpOnly; SameSite=Lax; Max-Age=2592000$/);
    const session = cookie.split(";")[0] ?? "";

    expect((await me(new Request("http://test/api/me"))).status).toBe(401);
    const card = await me(new Request("http://test/api/me", { headers: { cookie: session } }));
    expect(await card.json()).toMatchObject({ ok: true, value: { stamps: 0, threshold: 8 } });
    expect((await qr(new Request("http://test/api/me/qr", { headers: { cookie: session } }))).status).toBe(200);

    const out = await signOut(post("/api/auth/signout", {}, { cookie: session }));
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await me(new Request("http://test/api/me", { headers: { cookie: session } }))).status).toBe(401);
  });

  it("staff routes need a staff account and an idempotency key", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_STAMP_CARD", "true");
    const { POST: cards } = await import("@/app/api/staff/cards/route");
    const { POST: stamp } = await import("@/app/api/staff/stamps/route");
    expect((await cards(post("/api/staff/cards", { phone: "90000 00201" }))).status).toBe(403);
    const found = await cards(post("/api/staff/cards", { phone: "90000 00201" }, staff));
    const { value } = (await found.json()) as { value: { customerId: string; stamps: number } };
    expect(value.stamps).toBe(5);
    expect((await stamp(post("/api/staff/stamps", { customerId: value.customerId }, staff))).status).toBe(400);
    const added = await stamp(
      post("/api/staff/stamps", { customerId: value.customerId }, { ...staff, "idempotency-key": "s-1" }),
    );
    expect(added.status).toBe(201);
  });
});

describe("door routes", () => {
  it("work with the flag off, and refuse unknown tickets", async () => {
    vi.stubEnv("NEXT_PUBLIC_FLAG_STAMP_CARD", "false");
    const { POST: find } = await import("@/app/api/staff/tickets/route");
    expect((await find(post("/api/staff/tickets", { code: "CRB-E-0000" }, staff))).status).toBe(404);
    expect((await find(post("/api/staff/tickets", { token: "not.signed" }, staff))).status).toBe(400);
    expect((await find(post("/api/staff/tickets", {}, staff))).status).toBe(400);
  });
});
