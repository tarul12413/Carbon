/**
 * Indian mobile numbers (Blueprint 5.3: "Phone format check (+91)").
 * Accepts the ways people type them: "98765 43210", "+91-98765-43210", "098765 43210".
 */

const MOBILE = /^[6-9]\d{9}$/;

/** Returns E.164 ("+919876543210"), or null if this is not an Indian mobile number. */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const local = digits.replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, "");
  return MOBILE.test(local) ? `+91${local}` : null;
}

/** "+919876543210" → "+91 98765 43210". */
export function formatIndianMobile(e164: string): string {
  const local = e164.replace(/^\+91/, "");
  return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
}

/** "+919876543210" → "+91 ••••• •3210", for pages anyone with the code can open. */
export function maskIndianMobile(e164: string): string {
  return `+91 ••••• •${e164.slice(-4)}`;
}
