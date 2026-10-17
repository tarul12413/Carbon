import type { MenuEditInput } from "@/domain/admin/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../../respond";

/** Saves a draft for one item. It goes live on publish. */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/menu/items/[id]">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { id } = await ctx.params;
  const body = (await jsonBody(request)) as MenuEditInput;
  return respond(await serverBackend.admin.saveDraft(actor, id, body ?? {}, key));
}

/** Drops the item's draft. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/menu/items/[id]">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { id } = await ctx.params;
  return respond(await serverBackend.admin.saveDraft(actor, id, null, key));
}
