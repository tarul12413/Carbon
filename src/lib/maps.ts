import { site } from "@/config/site";
import type { Outlet } from "@/domain/outlet";

/** Google Maps search link. Only for confirmed addresses; callers check `addressTbc` first. */
export const mapsHref = (outlet: Pick<Outlet, "address">) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.name} ${outlet.address}`)}`;
