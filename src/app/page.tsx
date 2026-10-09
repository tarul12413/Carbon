import { BookWallTeaser } from "@/components/home/BookWallTeaser";
import { EventsTeaser } from "@/components/home/EventsTeaser";
import { Hero } from "@/components/home/Hero";
import { OutletsSection } from "@/components/home/OutletsSection";
import { Proof } from "@/components/home/Proof";
import { Signatures } from "@/components/home/Signatures";
import { SteepClock } from "@/components/home/SteepClock";
import { TodayAtCarbon } from "@/components/home/TodayAtCarbon";
import { services } from "@/services";

/** Rebuilt hourly so "Next up" (sample events dated from today) stays current. */
export const revalidate = 3600;

export default async function HomePage() {
  const [coldBrews, houseSignatures] = await Promise.all([
    services.menu.listColdBrews(),
    services.menu.listHouseSignatures(),
  ]);
  const brews = coldBrews.map(({ id, name, notes, steepHours }) => ({ id, name, notes, steepHours }));

  return (
    <main id="content">
      <Hero />
      <SteepClock brews={brews} />
      <TodayAtCarbon />
      <Signatures items={houseSignatures} />
      <OutletsSection />
      <EventsTeaser />
      <Proof />
      <BookWallTeaser />
    </main>
  );
}
