import { isOutletSlug } from "@/domain/outlet";
import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../respond";

/** The sold-out switch: `{ outlet, itemId, available }`. Live at once, no publish. */
export async function POST(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as Partial<{ outlet: string; itemId: string; available: boolean }> | null;
  if (!body || !isOutletSlug(body.outlet) || typeof body.itemId !== "string" || typeof body.available !== "boolean") {
    return respond({ ok: false, error: { code: "invalid_input" } });
  }
  return respond(await serverBackend.admin.setAvailability(actor, body.outlet, body.itemId, body.available, key));
}
