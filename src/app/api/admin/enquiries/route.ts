import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond } from "../../respond";

/** The enquiries inbox, newest first. */
export async function GET(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  return respond(await serverBackend.admin.listEnquiries(actor));
}
