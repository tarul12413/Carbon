import type { AdminActor } from "@/domain/admin/access";
import type {
  BookingDecision,
  EnquiryUpdate,
  MenuEdit,
  MenuEditInput,
  OutletSettings,
  OutletSettingsInput,
  PdfInput,
} from "@/domain/admin/schema";
import type { AuditEntry } from "@/domain/audit";
import type { Booking } from "@/domain/booking/schema";
import type { Enquiry } from "@/domain/enquiry/schema";
import type { EventInfo } from "@/domain/events/types";
import type { MenuCategory, MenuItem } from "@/domain/menu/schema";
import type { OutletSlug } from "@/domain/outlet";
import type { WallEntry } from "@/domain/wall/schema";
import type { ServiceResult } from "./errors";
import type { DoorView } from "./staff";

/** One outlet, or every outlet the account can see. */
export type OutletScope = OutletSlug | "all";

export interface SlotLoad {
  readonly time: string;
  readonly taken: number;
  readonly capacity: number;
}

export interface EventSales {
  readonly event: EventInfo;
  readonly sold: number;
  readonly quota: number;
  readonly checkedIn: number;
  readonly waiting: number;
  /** Seats reserved to pay at the cafe, not paid yet. */
  readonly unpaid: number;
}

/** Today at the selected outlets (Blueprint 5.7). Null: not for this role. */
export interface Dashboard {
  readonly scope: OutletScope;
  readonly date: string;
  readonly tables: {
    readonly covers: number;
    /** Group requests waiting for a decision, any date. Null: this role cannot decide them. */
    readonly requests: number | null;
    readonly today: readonly Booking[];
    /** Only for one outlet. */
    readonly slots: readonly SlotLoad[] | null;
  } | null;
  /** People checked in today: seated tables and event tickets. */
  readonly checkIns: number;
  /** Orders paid online today (amounts are unknown until Carbon sets prices). */
  readonly onlinePayments: number | null;
  readonly events: readonly EventSales[] | null;
  readonly wall: { readonly waiting: number; readonly reported: number } | null;
  readonly newEnquiries: number | null;
}

export interface BookingRow {
  readonly booking: Booking;
  /** Seats free at the booking's slot, without it: shown before approving a request. */
  readonly seatsLeft: number;
}

export type BookingQuery =
  | { readonly view: "requests"; readonly outlet: OutletScope }
  | { readonly view: "day"; readonly outlet: OutletScope; readonly date: string };

export interface OutletSettingsView {
  readonly slug: OutletSlug;
  readonly settings: OutletSettings;
  readonly defaults: Omit<OutletSettings, "blackouts">;
  /** Whether anything differs from the placeholders. */
  readonly saved: boolean;
}

export interface SettingsSaved {
  readonly view: OutletSettingsView;
  /** Upcoming bookings that now fall outside the hours or on a closed date. They stay booked. */
  readonly outside: number;
}

export interface AdminMenuItem {
  /** As published, with availability at each outlet. */
  readonly item: MenuItem;
  readonly off: readonly OutletSlug[];
  readonly draft?: MenuEdit;
  /** When it was last published from admin. */
  readonly editedAt?: string;
}

export interface AdminMenu {
  readonly categories: readonly MenuCategory[];
  readonly items: readonly AdminMenuItem[];
  readonly pdf: { readonly name: string; readonly bytes: number; readonly at: string; readonly shipped: boolean };
  /** Items published after the PDF was uploaded: the download no longer matches. */
  readonly changedSincePdf: readonly string[];
}

export interface Attendee {
  readonly code: string;
  readonly orderId: string;
  readonly name: string;
  readonly phoneMasked: string;
  readonly quantity: number;
  readonly ticketType: string;
  readonly paid: boolean;
  readonly valid: boolean;
  readonly checkedInAt: string | null;
}

export interface AttendeeList {
  readonly sales: EventSales;
  readonly attendees: readonly Attendee[];
  /** Seats in the sample data sold before the demo, with nobody to list. */
  readonly sampleSeats: number;
}

export interface ReportedSpine {
  readonly key: string;
  readonly title: string;
  readonly author: string;
  readonly reports: number;
  readonly lines: readonly string[];
}

export interface WallQueue {
  readonly waiting: readonly WallEntry[];
  readonly reported: readonly ReportedSpine[];
}

/**
 * The admin panel (Blueprint section 10 and /api/admin/*). Every call names the signed-in account;
 * the service checks the role and outlet, and logs each change with the account's name.
 */
export interface AdminService {
  dashboard(actor: AdminActor, scope: OutletScope): Promise<ServiceResult<Dashboard>>;

  listBookings(actor: AdminActor, query: BookingQuery): Promise<ServiceResult<readonly BookingRow[]>>;
  decideBooking(
    actor: AdminActor,
    code: string,
    decision: BookingDecision,
    idempotencyKey: string,
  ): Promise<ServiceResult<Booking>>;

  getSettings(actor: AdminActor): Promise<ServiceResult<readonly OutletSettingsView[]>>;
  saveSettings(
    actor: AdminActor,
    outlet: OutletSlug,
    input: OutletSettingsInput,
    idempotencyKey: string,
  ): Promise<ServiceResult<SettingsSaved>>;

  getMenu(actor: AdminActor): Promise<ServiceResult<AdminMenu>>;
  /** Saves a draft for one item; null drops it. */
  saveDraft(
    actor: AdminActor,
    itemId: string,
    input: MenuEditInput | null,
    idempotencyKey: string,
  ): Promise<ServiceResult<AdminMenu>>;
  /** Publishes every draft at once. */
  publishMenu(actor: AdminActor, idempotencyKey: string): Promise<ServiceResult<AdminMenu>>;
  setAvailability(
    actor: AdminActor,
    outlet: OutletSlug,
    itemId: string,
    available: boolean,
    idempotencyKey: string,
  ): Promise<ServiceResult<AdminMenu>>;
  /** Mock upload: checks the file and records it. The file itself is not kept. */
  uploadMenuPdf(actor: AdminActor, input: PdfInput, idempotencyKey: string): Promise<ServiceResult<AdminMenu>>;

  listEvents(actor: AdminActor): Promise<ServiceResult<readonly EventSales[]>>;
  attendees(actor: AdminActor, eventSlug: string): Promise<ServiceResult<AttendeeList>>;
  checkIn(
    actor: AdminActor,
    ticketCode: string,
    collected: boolean,
    idempotencyKey: string,
  ): Promise<ServiceResult<DoorView>>;
  /** A pay-at-cafe order paid at the counter before the event. */
  markPaid(actor: AdminActor, ticketCode: string, idempotencyKey: string): Promise<ServiceResult<DoorView>>;

  wallQueue(actor: AdminActor): Promise<ServiceResult<WallQueue>>;
  moderate(
    actor: AdminActor,
    entryId: string,
    decision: "approve" | "reject",
    idempotencyKey: string,
  ): Promise<ServiceResult<WallQueue>>;
  resolveReport(
    actor: AdminActor,
    spineKey: string,
    decision: "hide" | "keep",
    idempotencyKey: string,
  ): Promise<ServiceResult<WallQueue>>;

  listEnquiries(actor: AdminActor): Promise<ServiceResult<readonly Enquiry[]>>;
  updateEnquiry(
    actor: AdminActor,
    code: string,
    update: EnquiryUpdate,
    idempotencyKey: string,
  ): Promise<ServiceResult<Enquiry>>;

  audit(actor: AdminActor, scope: OutletScope): Promise<ServiceResult<readonly AuditEntry[]>>;
}
