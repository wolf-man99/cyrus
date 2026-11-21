import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name — required because the button only shows an icon. */
  label: string;
  icon: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'glass' | 'primary' | 'plain';
}

const sizes = { sm: 'size-9', md: 'size-11', lg: 'size-14' };
const tones = {
  glass: 'glass text-fg hover:bg-white/[0.1]',
  primary: 'bg-primary text-fg hover:bg-primary-strong',
  plain: 'text-muted hover:text-fg hover:bg-white/[0.06]',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = 'md', tone = 'glass', className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-[transform,background-color,color] active:scale-95 disabled:opacity-40',
        sizes[size],
        tones[tone],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
});
