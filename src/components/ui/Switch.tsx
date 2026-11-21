import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SwitchRowProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  checked: boolean;
  onChange(checked: boolean): void;
}

/** A full-width tappable row with an iOS-style switch. */
export function SwitchRow({ label, description, icon, checked, onChange }: SwitchRowProps) {
  const id = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={`${id}-label`}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-row border border-line bg-white/[0.04] px-4 py-3 text-left transition hover:bg-white/[0.06]"
    >
      {icon && <span className={cn('shrink-0 transition-colors', checked ? 'text-warning' : 'text-muted')}>{icon}</span>}
      <span className="min-w-0 flex-1">
        <span id={`${id}-label`} className="block text-callout font-medium">
          {label}
        </span>
        {description && <span className="block text-footnote text-muted">{description}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300',
          checked ? 'bg-primary' : 'bg-white/15',
        )}
      >
        <span
          className={cn(
            'absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-md transition-transform duration-300 ease-[var(--ease-spring)]',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  );
}
