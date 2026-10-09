import type { JoinWaitlistInput } from "@/domain/orders/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond } from "../../../respond";

export async function POST(request: Request, ctx: RouteContext<"/api/events/[slug]/waitlist">) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const { slug } = await ctx.params;
  const body = (await jsonBody(request)) as JoinWaitlistInput;
  return respond(await serverBackend.ticketing.joinWaitlist({ ...body, eventSlug: slug }, key), true);
}
