/** Random id for idempotency keys. Works outside secure contexts too (a phone on the LAN over http). */
export function randomId(): string {
  if (typeof crypto.randomUUID === "function" && globalThis.isSecureContext) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
