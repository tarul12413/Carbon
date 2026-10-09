import type { CreateOrderInput, DepositOrderInput } from "@/domain/orders/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond } from "../respond";

/** Tickets ({ eventSlug, ticketTypeId, quantity }) or a table deposit ({ bookingCode }). Prices are never read from the body. */
export async function POST(request: Request) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as (CreateOrderInput & DepositOrderInput) | null;
  const result = body?.bookingCode
    ? await serverBackend.ticketing.createDepositOrder(body, key)
    : await serverBackend.ticketing.createOrder(body as CreateOrderInput, key);
  return respond(result, true);
}
