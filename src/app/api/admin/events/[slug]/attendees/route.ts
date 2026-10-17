import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond } from "../../../../respond";

/** Everyone holding a ticket, with payment and check-in. */
export async function GET(request: Request, ctx: RouteContext<"/api/admin/events/[slug]/attendees">) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const { slug } = await ctx.params;
  return respond(await serverBackend.admin.attendees(actor, slug));
}
