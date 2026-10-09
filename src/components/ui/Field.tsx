import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export const inputClass =
  "min-h-12 w-full rounded-sm border border-line-strong bg-surface-raised px-3.5 py-2.5 text-fg placeholder:text-fg-muted aria-invalid:border-danger";

interface FieldShellProps {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: string;
  readonly children: (ids: { id: string; describedBy: string | undefined }) => ReactNode;
}

function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {children({ id, describedBy })}
      {error && (
        <p id={errorId} className="text-small text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="text-small text-fg-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = Omit<ComponentProps<"input">, "id"> & {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: string;
};

export function TextField({ label, hint, error, className, ...input }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cx(inputClass, className)}
          {...input}
        />
      )}
    </FieldShell>
  );
}

type TextAreaProps = Omit<ComponentProps<"textarea">, "id"> & {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly error?: string;
};

export function TextArea({ label, hint, error, className, ...textarea }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          rows={3}
          className={cx(inputClass, "resize-y", className)}
          {...textarea}
        />
      )}
    </FieldShell>
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "type" | "id"> & {
  readonly label: ReactNode;
  readonly error?: string;
};

export function Checkbox({ label, error, ...input }: CheckboxProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="flex min-h-11 items-center gap-3">
        <input
          id={id}
          type="checkbox"
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? true : undefined}
          className="size-5 shrink-0 accent-accent"
          {...input}
        />
        <span>{label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
