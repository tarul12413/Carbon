import type { EnquiryUpdate } from "@/domain/admin/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../respond";

/** `{ status, note? }`. */
export async function POST(request: Request, ctx: RouteContext<"/api/admin/enquiries/[code]">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { code } = await ctx.params;
  const body = (await jsonBody(request)) as EnquiryUpdate;
  return respond(await serverBackend.admin.updateEnquiry(actor, code, body ?? {}, key));
}
