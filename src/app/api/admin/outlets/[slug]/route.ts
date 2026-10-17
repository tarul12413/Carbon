import type { OutletSettingsInput } from "@/domain/admin/schema";
import { isOutletSlug } from "@/domain/outlet";
import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../respond";

/** Saves an outlet's hours, seats per slot and closed dates. */
export async function PUT(request: Request, ctx: RouteContext<"/api/admin/outlets/[slug]">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { slug } = await ctx.params;
  if (!isOutletSlug(slug)) return respond({ ok: false, error: { code: "not_found" } });
  const body = (await jsonBody(request)) as OutletSettingsInput;
  return respond(await serverBackend.admin.saveSettings(actor, slug, body, key));
}
