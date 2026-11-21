import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CheckCircleProps {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
  disabled?: boolean;
  className?: string;
}

/** Round, one-tap completion control (44px hit area around a 26px circle). */
export function CheckCircle({ checked, onChange, label, disabled, className }: CheckCircleProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('group -m-2.5 inline-flex size-11 shrink-0 items-center justify-center rounded-full', className)}
    >
      <span
        className={cn(
          'flex size-[26px] items-center justify-center rounded-full border-[1.5px] transition-all duration-300 ease-[var(--ease-spring)]',
          checked
            ? 'scale-100 border-transparent bg-aurora shadow-[0_0_16px_-2px_rgb(180_76_255/0.7)]'
            : 'border-white/25 group-hover:border-secondary/70 group-active:scale-90',
        )}
      >
        <Check
          className={cn('size-4 text-fg transition-all duration-300', checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0')}
          strokeWidth={3}
        />
      </span>
    </button>
  );
}
