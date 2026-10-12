import type { Metadata } from "next";
import { EnquiryForm } from "@/components/enquire/EnquiryForm";
import { copy } from "@/content/copy";
import { site } from "@/config/site";
import { isEnquiryType } from "@/domain/enquiry/types";
import { localDate } from "@/domain/time";
import { services } from "@/services";

export const metadata: Metadata = { title: copy.nav.enquire };

interface PageProps {
  readonly searchParams: Promise<{ type?: string }>;
}

/** /enquire?type=collab preselects the kind of enquiry. */
export default async function EnquirePage({ searchParams }: PageProps) {
  const [{ type }, outlets] = await Promise.all([searchParams, services.outlets.listOutlets()]);
  return (
    <main id="content" className="content-cap flex max-w-3xl flex-col py-8 laptop:py-14">
      <EnquiryForm
        initialType={isEnquiryType(type) ? type : undefined}
        outlets={outlets.map((o) => ({ slug: o.slug, name: o.name }))}
        today={localDate(new Date(), site.timeZone)}
      />
    </main>
  );
}
