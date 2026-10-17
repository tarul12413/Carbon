import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond } from "../../respond";

/** Capacity, hours and closed dates for each of the account's outlets. */
export async function GET(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  return respond(await serverBackend.admin.getSettings(actor));
}
