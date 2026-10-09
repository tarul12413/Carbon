import { placeholders } from "@/config/placeholders";
import type { OutletSlug } from "@/domain/outlet";

/** Blueprint section 9, booking_settings. Every number is a placeholder until Carbon confirms (P-01 to P-21). */
export interface BookingSettings {
  readonly slotMinutes: number;
  readonly dwellMinutes: number;
  readonly capacityPerSlot: number;
  readonly instantMaxPartySize: number;
  readonly maxPartySize: number;
  readonly minLeadMinutes: number;
  readonly maxDaysAhead: number;
  readonly holdMinutes: number;
  readonly changeCutoffMinutes: number;
}

const defaults: BookingSettings = {
  slotMinutes: placeholders.slotMinutes.value,
  dwellMinutes: placeholders.dwellMinutes.value,
  capacityPerSlot: placeholders.capacityPerSlot.value,
  instantMaxPartySize: placeholders.instantMaxPartySize.value,
  maxPartySize: placeholders.maxPartySize.value,
  minLeadMinutes: placeholders.minLeadMinutes.value,
  maxDaysAhead: placeholders.maxDaysAhead.value,
  holdMinutes: placeholders.holdMinutes.value,
  changeCutoffMinutes: placeholders.cancellationWindow.value.demoHours * 60,
};

/** Settings are per outlet in the blueprint; all three share the placeholders for now. */
const perOutlet: Readonly<Record<OutletSlug, BookingSettings>> = {
  "c-scheme": defaults,
  "raja-park": defaults,
  "vaishali-nagar": defaults,
};

export function bookingSettingsFor(outlet: OutletSlug): BookingSettings {
  return perOutlet[outlet];
}
