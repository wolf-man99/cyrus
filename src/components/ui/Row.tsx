import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface RowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

/** The standard list row (Orbit subscription-row pattern). Renders a button when tappable. */
export function Row({ leading, title, subtitle, trailing, onClick, className, children }: RowProps) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-callout font-semibold">{title}</span>
        {subtitle && <span className="mt-0.5 block truncate text-footnote text-muted">{subtitle}</span>}
        {children}
      </span>
      {trailing && <span className="shrink-0 text-subhead text-muted tabular">{trailing}</span>}
    </>
  );
  const classes = cn(
    'flex min-h-16 w-full items-center gap-3.5 rounded-row border border-line bg-surface/75 px-4 py-3 text-left',
    onClick && 'transition-colors hover:border-white/15 hover:bg-surface',
    className,
  );
  return onClick ? (
    <button type="button" onClick={onClick} className={classes}>
      {body}
    </button>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/** Round icon well used as a row's leading element. */
export function RowIcon({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-full',
        tone === 'primary' ? 'bg-primary/15 text-secondary' : 'bg-white/[0.06] text-muted',
      )}
    >
      {children}
    </span>
  );
}
