import type { Metadata } from "next";
import { ManageBooking } from "@/components/booking/ManageBooking";
import { copy } from "@/content/copy";
import { normalizeBookingCode } from "@/domain/booking/code";
import { bookingProps } from "../settings";

interface PageProps {
  readonly params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return { title: copy.booking.manage.title(normalizeBookingCode((await params).code)) };
}

export default async function ManageBookingPage({ params }: PageProps) {
  const code = normalizeBookingCode((await params).code);
  const { outlets, settings } = await bookingProps();
  return (
    <div className="content-cap flex max-w-3xl flex-col py-8 laptop:py-14">
      <ManageBooking code={code} outlets={outlets} settings={settings} />
    </div>
  );
}
