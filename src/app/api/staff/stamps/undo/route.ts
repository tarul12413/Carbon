import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond, staffActor, stampCardOff } from "../../../respond";

export async function POST(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const actor = staffActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as { entryId?: string } | null;
  return respond(await serverBackend.staff.undoStamp(actor, body?.entryId ?? "", key));
}
