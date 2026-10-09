import type { StockState } from "@/domain/events/stock";
import type {
  CheckoutInput,
  CreateOrderInput,
  DepositOrderInput,
  JoinWaitlistInput,
  Order,
  Ticket,
  WaitlistEntry,
} from "@/domain/orders/schema";
import type { ServiceResult } from "./errors";

export interface TicketTypeAvailability {
  readonly id: string;
  readonly name: string;
  readonly quota: number;
  readonly left: number;
  readonly state: StockState;
}

export interface EventAvailability {
  readonly slug: string;
  readonly ticketTypes: readonly TicketTypeAvailability[];
  /** People waiting or holding an offer. */
  readonly waitlistLength: number;
}

/** What the hosted checkout needs. The amount is decided by the server, never sent by the client. */
export interface GatewayOrder {
  readonly gatewayOrderId: string;
  readonly description: string;
  readonly amountPaise: number | null;
}

export interface CheckoutResult {
  readonly order: Order;
  /** Pay online: open the payment sheet with this. */
  readonly gateway?: GatewayOrder;
  /** Pay at the cafe: the ticket is issued now, unpaid. */
  readonly ticket?: Ticket;
}

export interface TicketView {
  readonly ticket: Ticket;
  readonly order: Order;
}

export interface WaitlistStatus {
  readonly entry: WaitlistEntry;
  /** Place in line; null once offered a seat, claimed or lapsed. */
  readonly position: number | null;
}

export interface PaymentProof {
  readonly paymentId: string;
  readonly signature: string;
}

/**
 * Event tickets, table deposits and the waitlist (Blueprint section 9: orders, payments, tickets,
 * waitlist; API: POST /api/orders, /orders/:id/verify, /events/:id/waitlist). Writes take an
 * idempotency key; one order per hold.
 */
export interface TicketingService {
  getAvailability(eventSlug: string): Promise<ServiceResult<EventAvailability>>;
  createOrder(input: CreateOrderInput, idempotencyKey: string): Promise<ServiceResult<Order>>;
  createDepositOrder(input: DepositOrderInput, idempotencyKey: string): Promise<ServiceResult<Order>>;
  getOrder(orderId: string): Promise<ServiceResult<Order>>;
  checkout(orderId: string, input: CheckoutInput, idempotencyKey: string): Promise<ServiceResult<CheckoutResult>>;
  /** Checks the gateway's signature. Does not finish the order: the webhook does (Blueprint step 5 and 6). */
  verifyPayment(orderId: string, proof: PaymentProof, idempotencyKey: string): Promise<ServiceResult<Order>>;
  getTicket(code: string): Promise<ServiceResult<TicketView>>;
  cancelTicket(code: string, idempotencyKey: string): Promise<ServiceResult<TicketView>>;
  joinWaitlist(input: JoinWaitlistInput, idempotencyKey: string): Promise<ServiceResult<WaitlistStatus>>;
  getWaitlistEntry(id: string): Promise<ServiceResult<WaitlistStatus>>;
}

export type PaymentOutcome = "captured" | "failed" | "pending";

/**
 * Stands in for the hosted payment sheet and the bank behind it (brief: a clearly labelled sample,
 * outcomes picked in a dev panel). Phase 2 replaces it with the real gateway and its webhooks.
 */
export interface DemoGateway {
  pay(
    gatewayOrderId: string,
    outcome: PaymentOutcome,
  ): Promise<ServiceResult<{ readonly paymentId: string; readonly signature?: string }>>;
  /** The bank answers a pending payment. `twice` delivers the same webhook twice, to show it counts once. */
  settlePending(gatewayOrderId: string, outcome: "captured" | "failed", twice: boolean): Promise<ServiceResult<Order>>;
}

export type { Order, Ticket, WaitlistEntry };
