import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../respond";

/** `{ decision: "approve" | "reject" }` for a waiting book. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/wall/[id]">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { id } = await ctx.params;
  const body = (await jsonBody(request)) as { decision?: string } | null;
  if (body?.decision !== "approve" && body?.decision !== "reject") {
    return respond({ ok: false, error: { code: "invalid_input" } });
  }
  return respond(await serverBackend.admin.moderate(actor, id, body.decision, key));
}
