import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond, stampCardOff } from "../../../respond";

/** Sends a sign-in code. Mock: the code comes back in `demoCode` instead of an SMS. */
export async function POST(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as Parameters<typeof serverBackend.loyalty.requestOtp>[0];
  return respond(await serverBackend.loyalty.requestOtp(body, key), true);
}
