import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface AmountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  prefix?: string;
  suffix?: string;
  error?: string;
  /** Visible width in characters. */
  chars?: number;
}

/** Large, centred numeric entry for fast logging (weight, money). */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(function AmountInput(
  { label, prefix, suffix, error, chars = 6.5, className, ...props },
  ref,
) {
  const id = useId();
  return (
    <div className={cn('min-w-0 text-center', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="flex items-baseline justify-center gap-1.5">
        {prefix && <span className="font-display text-title font-semibold text-muted">{prefix}</span>}
        <input
          ref={ref}
          id={id}
          inputMode="decimal"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          style={{ width: `${chars}ch` }}
          className="min-w-0 bg-transparent text-center font-display text-[3.5rem] leading-tight font-bold text-fg tabular caret-secondary placeholder:text-white/20 focus:outline-none"
          {...props}
        />
        {suffix && <span className="font-display text-title font-semibold text-muted">{suffix}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-footnote text-danger">
          {error}
        </p>
      )}
    </div>
  );
});
