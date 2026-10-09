import type { ConfirmInput } from "@/domain/booking/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond } from "../../../respond";

export async function POST(request: Request, ctx: RouteContext<"/api/bookings/[code]/confirm">) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { code } = await ctx.params;
  return respond(await serverBackend.bookings.confirm(code, (await jsonBody(request)) as ConfirmInput, key));
}
