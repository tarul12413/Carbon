import Link from "next/link";
import { copy } from "@/content/copy";

export default function HomePage() {
  return (
    <main className="content-cap flex min-h-svh flex-col justify-center gap-8 py-16">
      <h1 className="text-display font-semibold">{copy.home.heroHeadline}</h1>
      <p className="font-mono text-fg-muted">00h · {copy.m0.holding}</p>
      <Link href="/styleguide" className="text-accent underline underline-offset-4">
        {copy.m0.styleguideTitle}
      </Link>
    </main>
  );
}
