import type { BookingDecision } from "@/domain/admin/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../respond";

/** Approve, decline, seat, no-show, or a staff note: `{ action, note? }`. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/bookings/[code]">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { code } = await ctx.params;
  const body = (await jsonBody(request)) as BookingDecision;
  return respond(await serverBackend.admin.decideBooking(actor, code, body, key));
}
