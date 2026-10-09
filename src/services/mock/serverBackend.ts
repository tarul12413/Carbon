import { site } from "@/config/site";
import { createMockBackend, memoryStore, type MockBackend } from "./mockBackend";
import { mockOutlets } from "./outlets";

const globalForMock = globalThis as typeof globalThis & { carbonMock?: MockBackend };

/**
 * One in-memory backend per server process, kept on globalThis so dev reloads do not wipe it.
 * On Vercel each serverless instance has its own copy, which is why the hosted demo keeps its
 * data in the browser instead (D-026).
 */
export const serverBackend: MockBackend = (globalForMock.carbonMock ??= createMockBackend({
  store: memoryStore(),
  outlets: mockOutlets,
  timeZone: site.timeZone,
}));
