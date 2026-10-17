import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond } from "../../respond";

/** Upcoming events at the account's outlets, with sales and check-ins. */
export async function GET(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  return respond(await serverBackend.admin.listEvents(actor));
}
