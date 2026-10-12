import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond, staffActor } from "../../../../respond";

/** Marks the ticket used, once. `collected`: a pay-at-cafe ticket was paid at the door. */
export async function POST(request: Request, ctx: RouteContext<"/api/staff/tickets/[code]/check-in">) {
  const actor = staffActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { code } = await ctx.params;
  const body = (await jsonBody(request)) as { collected?: boolean } | null;
  return respond(await serverBackend.staff.checkIn(actor, code, body?.collected === true, key));
}
