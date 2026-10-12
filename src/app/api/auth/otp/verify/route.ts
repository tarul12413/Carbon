import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond, sessionCookie, stampCardOff } from "../../../respond";

/** Checks the code and starts a session in a secure, HTTP-only cookie (30 days, sliding). */
export async function POST(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as Parameters<typeof serverBackend.loyalty.verifyOtp>[0];
  const result = await serverBackend.loyalty.verifyOtp(body, key);
  const response = respond(result);
  if (result.ok) response.headers.append("set-cookie", sessionCookie(request, result.value.session));
  return response;
}
