import { OutletCard } from "@/components/outlets/OutletCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { copy } from "@/content/copy";
import { services } from "@/services";

const t = copy.home.outlets;

export async function OutletsSection() {
  const outlets = await services.outlets.listOutlets();
  return (
    <section aria-labelledby="outlets-title" className="border-t border-line">
      <div className="content-cap flex flex-col gap-10 py-16 laptop:py-24">
        <SectionHeading id="outlets-title" eyebrow={t.eyebrow}>
          {t.title}
        </SectionHeading>
        <ul className="grid gap-10 tablet:grid-cols-2 laptop:grid-cols-3">
          {outlets.map((outlet) => (
            <li key={outlet.slug}>
              <OutletCard outlet={outlet} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
