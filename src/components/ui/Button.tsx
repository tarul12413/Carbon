import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "secondary" | "quiet";

const base =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 font-medium transition-transform duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover-fine:brightness-110",
  secondary: "border border-fg text-fg hover-fine:bg-fg hover-fine:text-surface",
  quiet: "px-0 text-accent underline-offset-4 hover-fine:underline",
};

export const buttonClass = (variant: Variant = "primary", className?: string) => cx(base, variants[variant], className);

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "className"> {
  readonly variant?: Variant;
  readonly className?: string;
  readonly children: ReactNode;
}

export function ButtonLink({ variant = "primary", className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

interface ButtonProps extends ComponentProps<"button"> {
  readonly variant?: Variant;
}

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, className)} {...props} />;
}
