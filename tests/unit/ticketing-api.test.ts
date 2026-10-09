import { describe, expect, it } from "vitest";
import { POST as pay } from "@/app/api/demo-gateway/pay/route";
import { POST as checkout } from "@/app/api/orders/[id]/checkout/route";
import { GET as getOrder } from "@/app/api/orders/[id]/route";
import { POST as createOrder } from "@/app/api/orders/route";
import { POST as webhook } from "@/app/api/webhooks/payments/route";
import { DEMO_GATEWAY_KEY, signature } from "@/domain/orders/token";

const post = (url: string, payload: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://test${url}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
const signed = (payload: unknown) => {
  const body = JSON.stringify(payload);
  return new Request("http://test/api/webhooks/payments", {
    method: "POST",
    headers: { "x-demo-signature": signature(body, DEMO_GATEWAY_KEY) },
    body,
  });
};
const params = <T extends string>(key: T, value: string) => ({
  params: Promise.resolve({ [key]: value } as Record<T, string>),
});

describe("payment webhook route", () => {
  it("refuses unsigned or tampered bodies", async () => {
    const event = { id: "evt_1", type: "payment.captured", gatewayOrderId: "gw_x", paymentId: "pay_x" };
    expect((await webhook(post("/api/webhooks/payments", event))).status).toBe(401);
    const tampered = signed(event);
    const forged = new Request(tampered, { body: JSON.stringify({ ...event, gatewayOrderId: "gw_y" }) });
    expect((await webhook(forged)).status).toBe(401);
    expect((await webhook(signed(event))).status).toBe(404);
  });

  it("completes a pending order once, however often the event arrives", async () => {
    const created = await createOrder(
      post(
        "/api/orders",
        { eventSlug: "kitchen-rave", ticketTypeId: "general", quantity: 2, pricePaise: 1 },
        { "idempotency-key": "api-o" },
      ),
    );
    expect(created.status).toBe(201);
    const { value: order } = await created.json();
    expect(order.amountPaise).toBeNull();

    const customer = {
      name: "Test guest",
      phone: "9000000079",
      whatsappOptIn: false,
      privacyAccepted: true,
      noticeVersion: "draft-0",
      website: "",
    };
    const sheet = await checkout(
      post(`/api/orders/${order.id}/checkout`, { method: "online", customer }, { "idempotency-key": "api-c" }),
      params("id", order.id),
    );
    const { value: opened } = await sheet.json();
    const gatewayOrderId = opened.gateway.gatewayOrderId;

    const pending = await (await pay(post("/api/demo-gateway/pay", { gatewayOrderId, outcome: "pending" }))).json();
    const event = { id: "evt_api", type: "payment.captured", gatewayOrderId, paymentId: pending.value.paymentId };
    expect((await webhook(signed(event))).status).toBe(200);
    expect((await webhook(signed(event))).status).toBe(200);

    const final = await (await getOrder(new Request("http://test"), params("id", order.id))).json();
    expect(final.value.status).toBe("paid");
    expect(final.value.history.filter((h: { status: string }) => h.status === "paid")).toHaveLength(1);
  });
});
