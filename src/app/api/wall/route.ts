import { serverBackend } from "@/services/mock/serverBackend";
import { idempotencyKey, jsonBody, respond } from "../respond";

/** The shelf: approved books, merged by title. */
export async function GET() {
  return respond(await serverBackend.wall.getShelf());
}

/** Adds a book. It waits for staff approval. */
export async function POST(request: Request) {
  const key = idempotencyKey(request);
  if (key instanceof Response) return key;
  const body = (await jsonBody(request)) as Parameters<typeof serverBackend.wall.submit>[0];
  return respond(await serverBackend.wall.submit(body, key), true);
}
