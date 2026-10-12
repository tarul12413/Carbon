import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond } from "../respond";

/** Catering, collab or launch, workshop, other. */
export async function POST(request: Request) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as Parameters<typeof serverBackend.enquiries.submit>[0];
  return respond(await serverBackend.enquiries.submit(body, key), true);
}
