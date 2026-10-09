import { serverBackend } from "@/services/mock/serverBackend";
import { respond } from "../../respond";

export async function GET(_request: Request, ctx: RouteContext<"/api/orders/[id]">) {
  const { id } = await ctx.params;
  return respond(await serverBackend.ticketing.getOrder(id));
}
