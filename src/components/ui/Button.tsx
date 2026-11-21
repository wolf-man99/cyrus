import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leadingIcon?: ReactNode;
  block?: boolean;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-fg hover:bg-primary-strong disabled:opacity-50',
  secondary: 'glass text-fg hover:bg-white/[0.08] disabled:opacity-50',
  ghost: 'text-muted hover:text-fg hover:bg-white/[0.06] disabled:opacity-40',
  danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/20 disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-subhead gap-1.5',
  md: 'h-12 px-5 text-callout gap-2',
  lg: 'h-14 px-6 text-headline gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leadingIcon, block, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'relative inline-flex select-none items-center justify-center rounded-full font-semibold',
        'transition-[transform,background-color,color,opacity] active:scale-[0.98]',
        variants[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-5" /> : leadingIcon}
      <span className={cn(loading && 'opacity-80')}>{children}</span>
    </button>
  );
});
