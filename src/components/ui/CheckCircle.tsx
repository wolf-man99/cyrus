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
          'flex size-6 items-center justify-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] group-active:scale-90',
          checked ? 'border-transparent bg-primary' : 'border-white/25 group-hover:border-white/45',
        )}
      >
        <Check
          className={cn(
            'size-3.5 stroke-[3] text-fg transition-[transform,opacity]',
            checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
          )}
        />
      </span>
    </button>
  );
}
