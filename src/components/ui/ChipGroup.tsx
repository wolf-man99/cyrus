import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { FieldLabel } from './Field';

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface ChipGroupProps<T extends string | number> {
  label: string;
  hideLabel?: boolean;
  options: ChipOption<NoInfer<T>>[];
  value: T | null;
  onChange(value: NoInfer<T> | null): void;
  /** Allow tapping the selected chip again to clear it. */
  allowDeselect?: boolean;
  className?: string;
}

/** Single-select chips with radio-group semantics and arrow-key navigation. */
export function ChipGroup<T extends string | number>({
  label,
  hideLabel,
  options,
  value,
  onChange,
  allowDeselect,
  className,
}: ChipGroupProps<T>) {
  const labelId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + options.length) % options.length;
    refs.current[next]?.focus();
    onChange(options[next]!.value);
  };

  return (
    <div className={className}>
      {hideLabel ? (
        <span id={labelId} className="sr-only">
          {label}
        </span>
      ) : (
        <FieldLabel id={labelId}>{label}</FieldLabel>
      )}
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-2">
        {options.map((option, i) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected || (selectedIndex === -1 && i === 0) ? 0 : -1}
              onKeyDown={(e) => onKeyDown(e, i)}
              onClick={() => onChange(selected && allowDeselect ? null : option.value)}
              className={cn(
                'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-subhead font-medium transition-[background-color,border-color,color,transform] active:scale-[0.97]',
                selected ? 'border-transparent bg-primary text-fg' : 'border-line bg-white/[0.04] text-muted hover:text-fg',
              )}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
