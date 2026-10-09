import type { HoldInput } from "@/domain/booking/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond } from "../respond";

export async function POST(request: Request) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  return respond(await serverBackend.bookings.createHold((await jsonBody(request)) as HoldInput, key), true);
}
