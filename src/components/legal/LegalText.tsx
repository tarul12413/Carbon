import { Fragment } from "react";
import { Tbc } from "@/components/ui/Tbc";
import { placeholders, type PlaceholderKey } from "@/config/placeholders";

const shown = (value: unknown): string => {
  if (value && typeof value === "object" && "label" in value) return String(value.label);
  return String(value);
};

/**
 * Legal copy marks every unconfirmed value as [[placeholderKey]]. Each one renders from
 * src/config/placeholders.ts with its TBC tag, so the pages never state a rule Carbon has not set.
 */
export function LegalText({ text }: { readonly text: string }) {
  return (
    <>
      {text.split(/(\[\[\w+\]\])/).map((part, i) => {
        const key = /^\[\[(\w+)\]\]$/.exec(part)?.[1];
        if (key && key in placeholders) {
          const p = placeholders[key as PlaceholderKey];
          return (
            <Tbc key={i} id={p.id}>
              {shown(p.value)}
            </Tbc>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
