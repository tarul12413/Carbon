import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond, staffActor, stampCardOff } from "../../respond";

/** Adds one stamp: one ledger entry per idempotency key, with a minimum gap. */
export async function POST(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const actor = staffActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as { customerId?: string } | null;
  return respond(await serverBackend.staff.addStamp(actor, body?.customerId ?? "", key), true);
}
