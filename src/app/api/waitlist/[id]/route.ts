import { serverBackend } from "@/services/mock/serverBackend";
import { respond } from "../../respond";

export async function GET(_request: Request, ctx: RouteContext<"/api/waitlist/[id]">) {
  const { id } = await ctx.params;
  return respond(await serverBackend.ticketing.getWaitlistEntry(id));
}
