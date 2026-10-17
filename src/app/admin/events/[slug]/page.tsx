import type { Metadata } from "next";
import { AdminAttendees } from "@/components/admin/AdminEvents";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.events.attendees} · ${adminCopy.title}` };

export default async function AdminEventPage({ params }: PageProps<"/admin/events/[slug]">) {
  const { slug } = await params;
  return <AdminAttendees slug={slug} />;
}
