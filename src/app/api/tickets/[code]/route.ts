import { serverBackend } from "@/services/mock/serverBackend";
import { respond } from "../../respond";

export async function GET(_request: Request, ctx: RouteContext<"/api/tickets/[code]">) {
  const { code } = await ctx.params;
  return respond(await serverBackend.ticketing.getTicket(code));
}
