import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond } from "../../respond";

/** Books waiting for approval, and spines readers reported. */
export async function GET(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  return respond(await serverBackend.admin.wallQueue(actor));
}
