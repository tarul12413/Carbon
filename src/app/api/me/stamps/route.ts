import { serverBackend } from "@/services/mock/serverBackend";
import { respond, sessionFrom, stampCardOff } from "../../respond";

/** The stamp history, newest first. */
export async function GET(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const card = await serverBackend.loyalty.getCard(sessionFrom(request));
  return respond(card.ok ? { ok: true, value: card.value.history } : card);
}
