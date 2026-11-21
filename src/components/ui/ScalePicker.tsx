import { useId } from 'react';
import { cn } from '@/lib/cn';

interface ScalePickerProps {
  label: string;
  /** Five labels, lowest first. */
  labels: string[];
  value: number | null;
  onChange(value: number): void;
}

/** A 1–5 scale picked with one tap. */
export function ScalePicker({ label, labels, value, onChange }: ScalePickerProps) {
  const id = useId();
  return (
    <div>
      <p id={id} className="mb-2 text-footnote font-medium text-muted">
        {label}
        {value !== null && <span className="text-fg"> · {labels[value - 1]}</span>}
      </p>
      <div role="radiogroup" aria-labelledby={id} className="grid grid-cols-5 gap-2">
        {labels.map((l, i) => {
          const n = i + 1;
          const selected = value === n;
          return (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${n} – ${l}`}
              onClick={() => onChange(n)}
              className={cn(
                'flex h-14 flex-col items-center justify-center rounded-control border text-headline font-semibold tabular transition-[background-color,border-color,color,transform] active:scale-95',
                selected ? 'border-transparent bg-primary text-fg' : 'border-line bg-white/[0.04] text-muted hover:text-fg',
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}
