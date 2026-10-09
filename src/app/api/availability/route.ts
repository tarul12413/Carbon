import type { AvailabilityQuery } from "@/domain/booking/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { respond } from "../respond";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  return respond(
    await serverBackend.bookings.getAvailability(Object.fromEntries(params) as unknown as AvailabilityQuery),
  );
}
