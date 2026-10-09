import { bookingDbSchema } from "./bookingEngine";
import { memoryStore, type DbStore } from "./bookingBackend";

export const BROWSER_DB_KEY = "carbon-demo:bookings:v1";

/**
 * Keeps the mock database in this browser's localStorage (D-004), so a booking made on one page
 * is there on the next, whichever serverless instance served the page. Falls back to memory when
 * storage is blocked (private windows, strict settings) and starts over if the saved data is unreadable.
 */
export function browserStore(): DbStore {
  const fallback = memoryStore();
  return {
    read() {
      try {
        const saved = window.localStorage.getItem(BROWSER_DB_KEY);
        if (!saved) return fallback.read();
        const parsed = bookingDbSchema.safeParse(JSON.parse(saved));
        return parsed.success ? parsed.data : null;
      } catch {
        return fallback.read();
      }
    },
    write(db) {
      fallback.write(db);
      try {
        window.localStorage.setItem(BROWSER_DB_KEY, JSON.stringify(db));
      } catch {
        /* Storage full or blocked: the in-memory copy keeps this tab working. */
      }
    },
  };
}
