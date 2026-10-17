import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, respond } from "../../../respond";

/** Publishes every draft. Phase 2 also revalidates the public menu pages here. */
export async function POST(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  return respond(await serverBackend.admin.publishMenu(actor, key));
}
