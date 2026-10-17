import type { PdfInput } from "@/domain/admin/schema";
import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, idempotencyKey, jsonBody, respond } from "../../../respond";

/** Mock upload: the file's name, size and first bytes. Phase 2 sends the file to storage. */
export async function POST(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as PdfInput;
  return respond(await serverBackend.admin.uploadMenuPdf(actor, body ?? {}, key));
}
