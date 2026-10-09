import { DemoPanel } from "@/components/booking/DemoPanel";
import { flags } from "@/config/flags";

export default function BookLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <main id="content" className="flex flex-1 flex-col">
      {children}
      {flags.devPanel && <DemoPanel />}
    </main>
  );
}
