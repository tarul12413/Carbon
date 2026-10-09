import { serverBackend } from "@/services/mock/serverBackend";
import { respond } from "../../respond";

export async function GET(_request: Request, ctx: RouteContext<"/api/bookings/[code]">) {
  const { code } = await ctx.params;
  return respond(await serverBackend.bookings.getBooking(code));
}
