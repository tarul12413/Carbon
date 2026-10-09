import type { CheckoutInput } from "@/domain/orders/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond } from "../../../respond";

export async function POST(request: Request, ctx: RouteContext<"/api/orders/[id]/checkout">) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { id } = await ctx.params;
  return respond(await serverBackend.ticketing.checkout(id, (await jsonBody(request)) as CheckoutInput, key));
}
