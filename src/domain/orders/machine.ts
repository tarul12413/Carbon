/**
 * Order state machine for tickets and table deposits (Blueprint section 9, payment flow and edge cases).
 *
 * held             seats held for a few minutes while the customer pays
 * awaiting_payment the bank is still deciding (UPI pending)
 * reserved         pay at the cafe: seats kept until Carbon's deadline
 * paid             the payment webhook confirmed it, or staff took payment at the cafe
 * expired          the hold or the pay-at-cafe deadline ran out; seats released
 * cancelled        a pay-at-cafe reservation the customer gave up
 * refunded         money went back to the original method
 *
 * A failed attempt is not a state: the order stays held and the customer can try again.
 */

export const ORDER_STATUSES = [
  "held",
  "awaiting_payment",
  "reserved",
  "paid",
  "expired",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderEvent =
  "bank_pending" | "capture" | "bank_declined" | "reserve" | "settle_at_cafe" | "expire" | "cancel" | "refund";

const transitions: Readonly<Record<OrderStatus, Partial<Record<OrderEvent, OrderStatus>>>> = {
  held: { bank_pending: "awaiting_payment", capture: "paid", reserve: "reserved", expire: "expired" },
  awaiting_payment: { capture: "paid", bank_declined: "held", expire: "expired" },
  reserved: { settle_at_cafe: "paid", cancel: "cancelled", expire: "expired" },
  paid: { refund: "refunded" },
  /** Money can still arrive after a hold ran out (Blueprint 11): take the seats back if free, else refund. */
  expired: { capture: "paid", refund: "refunded" },
  cancelled: {},
  refunded: {},
};

export function nextOrderStatus(status: OrderStatus, event: OrderEvent): OrderStatus | null {
  return transitions[status][event] ?? null;
}

export function isFinalOrder(status: OrderStatus): boolean {
  return Object.keys(transitions[status]).length === 0;
}

/** Orders whose seats count against stock. */
export const HOLDS_SEATS: readonly OrderStatus[] = ["held", "awaiting_payment", "reserved", "paid"];
