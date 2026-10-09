import { serverBackend } from "@/services/mock/serverBackend";
import type { PaymentProof } from "@/services/ticketing";
import { idempotencyKey, jsonBody, respond } from "../../../respond";

export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/verify">) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { id } = await ctx.params;
  return respond(await serverBackend.ticketing.verifyPayment(id, (await jsonBody(request)) as PaymentProof, key));
}
