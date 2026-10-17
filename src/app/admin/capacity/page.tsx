import type { Metadata } from "next";
import { AdminCapacity } from "@/components/admin/AdminCapacity";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.nav.capacity} · ${adminCopy.title}` };

export default function AdminCapacityPage() {
  return <AdminCapacity />;
}
