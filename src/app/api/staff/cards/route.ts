import { serverBackend } from "@/services/mock/serverBackend";
import type { CardLookup } from "@/services/staff";
import { jsonBody, respond, staffActor, stampCardOff } from "../../respond";

/** Finds a card from a scanned QR token or a phone number. */
export async function POST(request: Request) {
  const off = stampCardOff();
  if (off) return off;
  const actor = staffActor(request);
  if (actor instanceof Response) return actor;
  const body = (await jsonBody(request)) as Partial<{ token: string; phone: string }> | null;
  const lookup: CardLookup | null = body?.token ? { token: body.token } : body?.phone ? { phone: body.phone } : null;
  if (!lookup) return respond({ ok: false, error: { code: "invalid_input" } });
  return respond(await serverBackend.staff.findCard(actor, lookup));
}
