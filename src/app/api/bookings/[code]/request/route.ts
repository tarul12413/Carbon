import type { RequestInput } from "@/domain/booking/schema";
import { serverBookings } from "@/services/mock/serverBookings";
import { idempotencyKey, jsonBody, respond } from "../../../respond";

export async function POST(request: Request, ctx: RouteContext<"/api/bookings/[code]/request">) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { code } = await ctx.params;
  return respond(await serverBookings.sendRequest(code, (await jsonBody(request)) as RequestInput, key));
}
