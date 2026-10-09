import { z } from "zod";
import { serverBackend } from "@/services/mock/serverBackend";
import { jsonBody, respond } from "../../respond";

const bodySchema = z.object({ gatewayOrderId: z.string(), outcome: z.enum(["captured", "failed", "pending"]) });

/** The sample payment sheet's Pay button (demo only; Phase 2 uses the gateway's hosted checkout). */
export async function POST(request: Request) {
  const body = bodySchema.safeParse(await jsonBody(request));
  if (!body.success) return Response.json({ ok: false, error: { code: "invalid_input" } }, { status: 400 });
  return respond(await serverBackend.gateway.pay(body.data.gatewayOrderId, body.data.outcome));
}
