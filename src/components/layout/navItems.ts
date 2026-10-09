import { copy } from "@/content/copy";
import { routes } from "@/config/routes";

export const primaryNav = [
  { href: routes.menu, label: copy.nav.menu },
  { href: routes.coldBrew, label: copy.nav.coldBrew },
  { href: routes.outlets, label: copy.nav.outlets },
  { href: routes.events, label: copy.nav.events },
  { href: routes.story, label: copy.nav.story },
] as const;
