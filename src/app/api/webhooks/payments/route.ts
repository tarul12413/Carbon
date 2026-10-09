import { webhookEventSchema } from "@/domain/orders/schema";
import { DEMO_GATEWAY_KEY, sameSignature, signature } from "@/domain/orders/token";
import { serverBackend } from "@/services/mock/serverBackend";
import { respond } from "../../respond";

const eventSchema = webhookEventSchema.omit({ receivedAt: true });

/**
 * The payment webhook (Blueprint step 6): the gateway signs the raw body; we check it before
 * reading anything. Repeated event ids are acknowledged and ignored.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const sent = request.headers.get("x-demo-signature") ?? "";
  if (!sameSignature(sent, signature(raw, DEMO_GATEWAY_KEY))) {
    return Response.json({ ok: false, error: { code: "signature_invalid" } }, { status: 401 });
  }
  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const event = eventSchema.safeParse(body);
  if (!event.success) return Response.json({ ok: false, error: { code: "invalid_input" } }, { status: 400 });
  return respond(await serverBackend.webhooks.receive(event.data));
}
