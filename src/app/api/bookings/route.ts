import type { HoldInput } from "@/domain/booking/schema";
import { serverBookings } from "@/services/mock/serverBookings";
import { idempotencyKey, jsonBody, respond } from "../respond";

export async function POST(request: Request) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  return respond(await serverBookings.createHold((await jsonBody(request)) as HoldInput, key), true);
}
