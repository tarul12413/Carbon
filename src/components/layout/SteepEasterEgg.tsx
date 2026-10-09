"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { routes } from "@/config/routes";

export const STEEP_TO_END_EVENT = "carbon:steep-to-end";

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/** Type "96" anywhere (outside form fields) and the steep clock runs to the end. */
export function SteepEasterEgg() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let last = "";
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return;
      if (event.key === "6" && last === "9") {
        if (pathname === routes.home) window.dispatchEvent(new Event(STEEP_TO_END_EVENT));
        else router.push(routes.steepEnd);
      }
      last = event.key;
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pathname, router]);

  return null;
}
