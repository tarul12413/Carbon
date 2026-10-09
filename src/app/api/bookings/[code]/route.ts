import { serverBookings } from "@/services/mock/serverBookings";
import { respond } from "../../respond";

export async function GET(_request: Request, ctx: RouteContext<"/api/bookings/[code]">) {
  const { code } = await ctx.params;
  return respond(await serverBookings.getBooking(code));
}
