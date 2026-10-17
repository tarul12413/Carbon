import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond, scopeFrom } from "../../respond";

/** Newest first. Owners see every outlet; managers their own. */
export async function GET(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  return respond(await serverBackend.admin.audit(actor, scopeFrom(request)));
}
