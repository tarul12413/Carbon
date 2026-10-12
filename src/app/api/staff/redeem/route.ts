import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond, staffActor, stampCardOff } from "../../respond";

/** Redeems a full card with the outlet PIN. */
export async function POST(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const actor = staffActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as { customerId?: string; pin?: string } | null;
  return respond(await serverBackend.staff.redeem(actor, body?.customerId ?? "", body?.pin ?? "", key));
}
