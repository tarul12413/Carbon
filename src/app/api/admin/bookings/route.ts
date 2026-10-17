import { serverBackend } from "@/services/mock/serverBackend";
import { adminActor, respond, scopeFrom } from "../../respond";

/** `?view=requests` lists group requests to decide; otherwise one day's bookings (`?date=YYYY-MM-DD`). */
export async function GET(request: Request) {
  const actor = adminActor(request);
  if (actor instanceof Response) return actor;
  const params = new URL(request.url).searchParams;
  const outlet = scopeFrom(request);
  const query =
    params.get("view") === "requests"
      ? ({ view: "requests", outlet } as const)
      : ({ view: "day", outlet, date: params.get("date") ?? "" } as const);
  return respond(await serverBackend.admin.listBookings(actor, query));
}
