import type { Metadata } from "next";
import { Checkout } from "@/components/checkout/Checkout";
import { copy } from "@/content/copy";
import { services } from "@/services";

export const metadata: Metadata = { title: copy.checkout.title };

interface PageProps {
  readonly params: Promise<{ orderId: string }>;
}

/** Orders live in the visitor's browser in the hosted demo (D-026), so the page loads them on the client. */
export default async function CheckoutPage({ params }: PageProps) {
  const [{ orderId }, events, outlets] = await Promise.all([
    params,
    services.events.listUpcoming(),
    services.outlets.listOutlets(),
  ]);
  const outletNames = Object.fromEntries(outlets.map((o) => [o.slug, o.name]));
  return (
    <main id="content" className="content-cap fold-left flex max-w-2xl flex-col py-8 laptop:py-14">
      <Checkout
        orderId={orderId}
        events={events.map((e) => ({ slug: e.slug, title: e.title, outletName: outletNames[e.outlet] ?? e.outlet }))}
        outletNames={outletNames}
      />
    </main>
  );
}
