import { serverBackend } from "@/services/mock/serverBackend";
import { respond, sessionCookie, sessionFrom, stampCardOff } from "../respond";

/** The signed-in customer's stamp card. */
export async function GET(request: Request) {
  return stampCardOff() ?? respond(await serverBackend.loyalty.getCard(sessionFrom(request)));
}

/** Self-service deletion (Blueprint section 12). */
export async function DELETE(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const response = respond(await serverBackend.loyalty.deleteCard(sessionFrom(request)));
  response.headers.append("set-cookie", sessionCookie(request, null));
  return response;
}
