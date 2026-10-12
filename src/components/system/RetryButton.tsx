"use client";

import { Button } from "@/components/ui/Button";

export function RetryButton({ label }: { readonly label: string }) {
  return <Button onClick={() => window.location.reload()}>{label}</Button>;
}
