import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../respond";

/** `{ action: "check_in", collected? }`, or `{ action: "paid" }` when paid at the counter before the event. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/tickets/[code]">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { code } = await ctx.params;
  const body = (await jsonBody(request)) as Partial<{ action: string; collected: boolean }> | null;
  if (body?.action === "paid") return respond(await serverBackend.admin.markPaid(actor, code, key));
  if (body?.action === "check_in") {
    return respond(await serverBackend.admin.checkIn(actor, code, body.collected === true, key));
  }
  return respond({ ok: false, error: { code: "invalid_input" } });
}
