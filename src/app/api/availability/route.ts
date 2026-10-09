import type { AvailabilityQuery } from "@/domain/booking/schema";
import { serverBookings } from "@/services/mock/serverBookings";
import { respond } from "../respond";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return respond(await serverBookings.getAvailability(Object.fromEntries(params) as unknown as AvailabilityQuery));
}
