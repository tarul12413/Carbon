/** Booking codes look like CRB-4821 (Blueprint section 9). `random` returns [0, 1). */
export function newBookingCode(taken: ReadonlySet<string>, random: () => number): string {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const code = `CRB-${1000 + Math.floor(random() * 9000)}`;
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not find a free booking code");
}

export function normalizeBookingCode(input: string): string {
  const digits = input
    .trim()
    .toUpperCase()
    .replace(/^CRB-?/, "");
  return `CRB-${digits}`;
}
