import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../../respond";

/** `{ decision: "hide" | "keep" }` for a reported spine. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/wall/reports/[key]">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const idem = idempotencyKey(request);
  if (idem instanceof Response) return idem;
  const { key } = await ctx.params;
  const body = (await jsonBody(request)) as { decision?: string } | null;
  if (body?.decision !== "hide" && body?.decision !== "keep") {
    return respond({ ok: false, error: { code: "invalid_input" } });
  }
  return respond(await serverBackend.admin.resolveReport(actor, decodeURIComponent(key), body.decision, idem));
}
