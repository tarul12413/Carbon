import type { Metadata } from "next";
import { AdminEvents } from "@/components/admin/AdminEvents";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.nav.events} · ${adminCopy.title}` };

export default function AdminEventsPage() {
  return <AdminEvents />;
}
