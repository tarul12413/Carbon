import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, respond } from "../../../respond";

/** Flags a book for staff to look at. */
export async function POST(request: Request, ctx: RouteContext<"/api/wall/[key]/report">) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { key: spine } = await ctx.params;
  return respond(await serverBackend.wall.report(decodeURIComponent(spine), key), true);
}
