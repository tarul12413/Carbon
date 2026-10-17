import type { Metadata } from "next";
import { AdminBookings } from "@/components/admin/AdminBookings";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.nav.bookings} · ${adminCopy.title}` };

export default function AdminBookingsPage() {
  return <AdminBookings />;
}
