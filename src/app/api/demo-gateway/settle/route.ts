import { z } from "zod";
import { serverBackend } from "@/services/mock/serverBackend";
import { jsonBody, respond } from "../../respond";

const bodySchema = z.object({
  gatewayOrderId: z.string(),
  outcome: z.enum(["captured", "failed"]),
  twice: z.boolean().default(false),
});

/** The bank answers a pending payment (demo only). */
export async function POST(request: Request) {
  const body = bodySchema.safeParse(await jsonBody(request));
  if (!body.success) return Response.json({ ok: false, error: { code: "invalid_input" } }, { status: 400 });
  return respond(
    await serverBackend.gateway.settlePending(body.data.gatewayOrderId, body.data.outcome, body.data.twice),
  );
}
