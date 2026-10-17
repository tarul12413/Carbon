import type { Metadata } from "next";
import { AdminEnquiries } from "@/components/admin/AdminEnquiries";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.nav.enquiries} · ${adminCopy.title}` };

export default function AdminEnquiriesPage() {
  return <AdminEnquiries />;
}
