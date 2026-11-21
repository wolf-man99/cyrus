import { useId } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

interface SegmentedControlProps<T extends string> {
  label: string;
  options: { value: NoInfer<T>; label: string }[];
  value: T;
  onChange(value: NoInfer<T>): void;
  size?: 'sm' | 'md';
  className?: string;
}

/** iOS-style segmented control (tablist semantics). */
export function SegmentedControl<T extends string>({ label, options, value, onChange, size = 'md', className }: SegmentedControlProps<T>) {
  const layoutId = useId();
  return (
    <div role="tablist" aria-label={label} className={cn('glass flex rounded-full p-1', className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex-1 whitespace-nowrap rounded-full font-medium transition-colors',
              size === 'sm' ? 'h-8 px-2 text-footnote' : 'h-9 px-3 text-subhead',
              selected ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-primary shadow-[0_0_18px_-6px_rgb(180_76_255/0.9)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
