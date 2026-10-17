import { AdminShell } from "@/components/admin/AdminShell";
import { services } from "@/services";

/** The back office (Blueprint section 10). Data lives in this browser in the demo (D-026), so it loads there. */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const outlets = await services.outlets.listOutlets();
  return (
    <main id="content" className="flex flex-1 flex-col">
      <div className="content-cap flex flex-col">
        <AdminShell outlets={outlets.map(({ slug, name }) => ({ slug, name }))}>{children}</AdminShell>
      </div>
    </main>
  );
}
