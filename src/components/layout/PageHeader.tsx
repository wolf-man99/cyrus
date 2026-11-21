import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Large-title page header (iOS style). */
export function PageHeader({ eyebrow, title, description, leading, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('pt-2 pb-6', className)}>
      {(leading || actions) && (
        <div className="mb-5 flex min-h-11 items-center justify-between gap-3">
          <div>{leading}</div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      )}
      {eyebrow && <p className="mb-1 text-subhead font-medium text-muted">{eyebrow}</p>}
      <h1 className="font-display text-display font-semibold">{title}</h1>
      {description && <p className="mt-2 max-w-prose text-callout text-muted">{description}</p>}
    </header>
  );
}
