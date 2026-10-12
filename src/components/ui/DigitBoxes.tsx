"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";
import { cx } from "@/lib/cx";

interface DigitBoxesProps {
  readonly length: number;
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** Group name, e.g. "Six-digit code". */
  readonly label: string;
  readonly digitLabel: (i: number, of: number) => string;
  readonly invalid?: boolean;
  readonly describedBy?: string;
  /** "one-time-code" lets phones fill an SMS code in one tap. */
  readonly autoComplete?: "one-time-code" | "off";
  /** Hide what is typed (outlet PIN). */
  readonly secret?: boolean;
  readonly autoFocus?: boolean;
}

/**
 * One box per digit (wireframes 09 and 11). Typing moves on, Backspace moves back, and pasting or
 * autofilling the whole code fills every box.
 */
export function DigitBoxes({
  length,
  value,
  onChange,
  label,
  digitLabel,
  invalid,
  describedBy,
  autoComplete = "off",
  secret,
  autoFocus,
}: DigitBoxesProps) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => boxes.current[Math.max(0, Math.min(length - 1, i))]?.focus();

  const fill = (from: number, typed: string) => {
    const digits = typed.replace(/\D/g, "");
    if (!digits) return;
    const chars = value.padEnd(length, " ").split("");
    digits
      .slice(0, length - from)
      .split("")
      .forEach((d, k) => (chars[from + k] = d));
    onChange(chars.join("").trimEnd().replace(/ /g, ""));
    focus(from + digits.length);
  };

  const onKeyDown = (i: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace") {
      event.preventDefault();
      const target = value[i] ? i : i - 1;
      if (target < 0) return;
      onChange(value.slice(0, target) + value.slice(target + 1));
      focus(target);
    } else if (event.key === "ArrowLeft") focus(i - 1);
    else if (event.key === "ArrowRight") focus(i + 1);
  };

  const onPaste = (i: number) => (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    fill(i, event.clipboardData.getData("text"));
  };

  return (
    <div role="group" aria-label={label} aria-describedby={describedBy} className="flex gap-1.5 tablet:gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          type={secret ? "password" : "text"}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? autoComplete : "off"}
          autoFocus={autoFocus && i === 0}
          aria-label={digitLabel(i + 1, length)}
          aria-invalid={invalid ? true : undefined}
          value={value[i] ?? ""}
          onChange={(event) => fill(Math.min(i, value.length), event.target.value)}
          onKeyDown={onKeyDown(i)}
          onPaste={onPaste(i)}
          onFocus={(event) => event.target.select()}
          className={cx(
            "size-12 min-w-0 rounded-sm border border-line-strong bg-surface-raised text-center font-mono text-h3 text-fg",
            "focus-visible:border-accent aria-invalid:border-danger tablet:size-14",
          )}
        />
      ))}
    </div>
  );
}
