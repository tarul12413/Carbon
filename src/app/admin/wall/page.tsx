import type { Metadata } from "next";
import { AdminWall } from "@/components/admin/AdminWall";
import { adminCopy } from "@/content/admin-copy";

export const metadata: Metadata = { title: `${adminCopy.nav.wall} · ${adminCopy.title}` };

export default function AdminWallPage() {
  return <AdminWall />;
}
