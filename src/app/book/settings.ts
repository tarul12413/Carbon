import { bookingSettingsFor, type BookingSettings } from "@/domain/booking/settings";
import { OUTLET_SLUGS, type OutletSlug } from "@/domain/outlet";
import { services } from "@/services";

/** What the booking pages need from the server: outlets and their booking settings. */
export async function bookingProps() {
  const outlets = (await services.outlets.listOutlets()).map(({ slug, name, address, addressTbc }) => ({
    slug,
    name,
    address,
    ...(addressTbc ? { addressTbc } : {}),
  }));
  const settings = Object.fromEntries(OUTLET_SLUGS.map((slug) => [slug, bookingSettingsFor(slug)])) as Record<
    OutletSlug,
    BookingSettings
  >;
  return { outlets, settings };
}
