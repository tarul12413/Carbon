import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { copy } from "@/content/copy";
import { bookingProps } from "./settings";

export const metadata: Metadata = { title: copy.booking.title };

/** The booking flow. Step one is in the HTML; the flow hydrates over it (D-061). */
export default async function BookPage() {
  const { outlets, settings } = await bookingProps();
  return <BookingFlow outlets={outlets} settings={settings} />;
}
