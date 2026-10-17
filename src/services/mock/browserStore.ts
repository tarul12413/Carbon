import { mockDbSchema, type MockDb } from "./db";
import type { DbStore } from "./mockBackend";
import { BROWSER_DB_KEY } from "./storageKey";

/**
 * Keeps the mock database in this browser's localStorage (D-026), so a booking made on one page
 * is there on the next, whichever serverless instance served the page. Falls back to memory when
 * storage is blocked (private windows, strict settings) and starts over if the saved data is unreadable.
 *
 * The parsed copy stays in memory and is parsed again only when the saved text changes (another
 * tab wrote to it): checking the whole database on every call made each tap slower (D-061).
 */
export function browserStore(): DbStore {
  let current: MockDb | null = null;
  let lastSaved: string | null = null;
  return {
    read() {
      let saved: string | null;
      try {
        saved = window.localStorage.getItem(BROWSER_DB_KEY);
      } catch {
        return current;
      }
      if (saved === null) return lastSaved === null ? current : null;
      if (saved === lastSaved && current) return current;
      try {
        const parsed = mockDbSchema.safeParse(JSON.parse(saved));
        current = parsed.success ? parsed.data : null;
      } catch {
        current = null;
      }
      lastSaved = saved;
      return current;
    },
    write(db) {
      current = db;
      const text = JSON.stringify(db);
      try {
        window.localStorage.setItem(BROWSER_DB_KEY, text);
        lastSaved = text;
      } catch {
        /* Storage full or blocked: the in-memory copy keeps this tab working. */
      }
    },
  };
}
