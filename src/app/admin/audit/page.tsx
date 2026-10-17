import type { Metadata } from "next";
import { AdminAudit } from "@/components/admin/AdminAudit";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.nav.audit} · ${adminCopy.title}` };

export default function AdminAuditPage() {
  return <AdminAudit />;
}
