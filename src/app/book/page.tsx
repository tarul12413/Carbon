import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { FlowFrame, OutletChoices, type FlowOutlet } from "@/components/booking/FlowFrame";
import { StepHeader } from "@/components/booking/StepHeader";
import { Button } from "@/components/ui/Button";
import { copy } from "@/content/copy";
import { bookingProps } from "./settings";

const t = copy.booking;

export const metadata: Metadata = { title: t.title };

export default async function BookPage() {
  const { outlets, settings } = await bookingProps();
  return (
    <Suspense fallback={<FirstPaint outlets={outlets} />}>
      <BookingFlow outlets={outlets} settings={settings} />
    </Suspense>
  );
}

/** Step one as static HTML, shown until the flow (which reads the URL and saved draft) takes over. */
function FirstPaint({ outlets }: { readonly outlets: readonly FlowOutlet[] }) {
  return (
    <FlowFrame
      header={<StepHeader step={1} title={t.steps.outlet} />}
      action={<Button disabled>{t.continue}</Button>}
      summary={{}}
    >
      <OutletChoices outlets={outlets} />
    </FlowFrame>
  );
}
