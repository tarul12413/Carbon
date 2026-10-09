import { serverBackend } from "@/services/mock/serverBackend";
import { respond } from "../../../respond";

export async function GET(_request: Request, ctx: RouteContext<"/api/events/[slug]/availability">) {
  const { slug } = await ctx.params;
  return respond(await serverBackend.ticketing.getAvailability(slug));
}
