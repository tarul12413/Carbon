import type { Metadata } from "next";
import { AdminMenu } from "@/components/admin/AdminMenu";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.nav.menu} · ${adminCopy.title}` };

export default function AdminMenuPage() {
  return <AdminMenu />;
}
