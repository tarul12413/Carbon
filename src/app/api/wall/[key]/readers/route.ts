import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, respond } from "../../../respond";

/** "I read this too". */
export async function POST(request: Request, ctx: RouteContext<"/api/wall/[key]/readers">) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { key: spine } = await ctx.params;
  return respond(await serverBackend.wall.addReader(decodeURIComponent(spine), key), true);
}
