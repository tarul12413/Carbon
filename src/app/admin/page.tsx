import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.dashboard.title} · ${adminCopy.title}` };

export default function AdminPage() {
  return <AdminDashboard />;
}
