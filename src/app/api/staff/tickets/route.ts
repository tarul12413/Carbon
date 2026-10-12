import { serverBackend } from "@/services/mock/serverBackend";
import type { TicketLookup } from "@/services/staff";
import { jsonBody, respond, staffActor } from "../../respond";

/** Finds a ticket at the door from its scanned QR token or its code. */
export async function POST(request: Request) {
  const actor = staffActor(request);
  if (actor instanceof Response) return actor;
  const body = (await jsonBody(request)) as Partial<{ token: string; code: string }> | null;
  const lookup: TicketLookup | null = body?.token ? { token: body.token } : body?.code ? { code: body.code } : null;
  if (!lookup) return respond({ ok: false, error: { code: "invalid_input" } });
  return respond(await serverBackend.staff.findTicket(actor, lookup));
}
