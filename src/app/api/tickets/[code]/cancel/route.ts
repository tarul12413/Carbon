import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, respond } from "../../../respond";

export async function POST(request: Request, ctx: RouteContext<"/api/tickets/[code]/cancel">) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { code } = await ctx.params;
  return respond(await serverBackend.ticketing.cancelTicket(code, key));
}
