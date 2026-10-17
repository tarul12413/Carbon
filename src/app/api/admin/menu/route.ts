import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond } from "../../respond";

/** The menu as published, with drafts, availability per outlet and the PDF check. */
export async function GET(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  return respond(await serverBackend.admin.getMenu(actor));
}
