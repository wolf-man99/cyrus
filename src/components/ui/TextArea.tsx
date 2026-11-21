import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hideLabel?: boolean;
  error?: string;
  hint?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { label, hideLabel, error, hint, className, id, rows = 4, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={className}>
      <label htmlFor={inputId} className={cn('mb-2 block text-footnote font-medium text-muted', hideLabel && 'sr-only')}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        maxLength={4000}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={cn(
          'block w-full resize-y rounded-control border bg-white/[0.04] px-4 py-3 text-body leading-relaxed text-fg transition-colors placeholder:text-subtle focus:border-white/30 focus:bg-white/[0.06] focus:outline-none',
          error ? 'border-danger/60' : 'border-line',
        )}
        {...props}
      />
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
