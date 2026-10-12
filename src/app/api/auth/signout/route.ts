import { serverBackend } from "@/services/mock/serverBackend";
import { respond, sessionCookie, sessionFrom, stampCardOff } from "../../respond";

export async function POST(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const response = respond(await serverBackend.loyalty.signOut(sessionFrom(request)));
  response.headers.append("set-cookie", sessionCookie(request, null));
  return response;
}
