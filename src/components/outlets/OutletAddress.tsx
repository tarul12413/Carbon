import { Icon } from "@/components/ui/Icon";
import { Tbc } from "@/components/ui/Tbc";
import type { Outlet } from "@/domain/outlet";

export function OutletAddress({ outlet }: { readonly outlet: Outlet }) {
  return (
    <p className="flex gap-2 text-fg-muted">
      <Icon name="pin" className="mt-1" />
      <span>{outlet.addressTbc ? <Tbc id={outlet.addressTbc}>{outlet.address}</Tbc> : outlet.address}</span>
    </p>
  );
}
