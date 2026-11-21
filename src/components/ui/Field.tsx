import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hideLabel?: boolean;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hideLabel, error, hint, trailing, className, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={cn('mb-2 block text-footnote font-medium text-muted', hideLabel && 'sr-only')}>
        {label}
      </label>
      <div
        className={cn(
          'flex items-center rounded-row border bg-white/[0.04] transition-colors focus-within:border-secondary/70 focus-within:bg-white/[0.06]',
          error ? 'border-danger/60' : 'border-line',
        )}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-13 w-full min-w-0 bg-transparent px-4 text-body text-fg placeholder:text-subtle focus:outline-none"
          {...props}
        />
        {trailing && <div className="pr-3">{trailing}</div>}
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="mt-1.5 px-1 text-footnote text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 px-1 text-footnote text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function FieldLabel({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <p id={id} className="mb-2 text-footnote font-medium text-muted">
      {children}
    </p>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1.5 px-1 text-footnote text-danger">
      {message}
    </p>
  );
}
