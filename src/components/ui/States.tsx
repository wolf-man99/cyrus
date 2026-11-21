import type { ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/** Shimmering placeholder rows while data loads. */
export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-16 items-center gap-3 rounded-row bg-white/[0.035] px-4">
          <div className="size-9 animate-shimmer rounded-full bg-white/[0.07]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-shimmer rounded-full bg-white/[0.08]" />
            <div className="h-2.5 w-1/4 animate-shimmer rounded-full bg-white/[0.05]" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-card border border-dashed border-white/10 text-center',
        compact ? 'px-5 py-6' : 'px-6 py-10',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-primary/15 text-secondary">{icon}</div>
      )}
      <p className="text-headline font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-xs text-subhead text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  error,
  onRetry,
  className,
}: {
  title?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}) {
  const message = error instanceof Error ? error.message : undefined;
  return (
    <div role="alert" className={cn('flex items-start gap-3 rounded-card border border-danger/25 bg-danger/[0.07] p-4', className)}>
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
      <div className="min-w-0 flex-1">
        <p className="text-callout font-semibold">{title}</p>
        {message && <p className="mt-0.5 break-words text-footnote text-muted">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} leadingIcon={<RotateCw className="size-4" />}>
          Retry
        </Button>
      )}
    </div>
  );
}
