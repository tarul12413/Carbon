import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond, scopeFrom } from "../../respond";

/** Today at the account's outlets: covers, requests, payments, check-ins, slots. `?outlet=` narrows it. */
export async function GET(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  return respond(await serverBackend.admin.dashboard(actor, scopeFrom(request)));
}
