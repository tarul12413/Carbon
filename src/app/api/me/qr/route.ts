import { serverBackend } from "@/services/mock/serverBackend";
import { respond, sessionFrom, stampCardOff } from "../../respond";

/** A fresh QR token for the barista, valid for 60 seconds. */
export async function GET(request: Request) {
  return stampCardOff() ?? respond(await serverBackend.loyalty.getQr(sessionFrom(request)));
}
