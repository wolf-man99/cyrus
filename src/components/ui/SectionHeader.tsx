import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  title: string;
  /** Muted value on the right, e.g. "2 of 5" (Orbit "Free Trials … $5.05"). */
  meta?: ReactNode;
  action?: ReactNode;
  id?: string;
  className?: string;
}

export function SectionHeader({ title, meta, action, id, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex min-h-9 items-center justify-between gap-3 px-1', className)}>
      <h2 id={id} className="text-subhead font-medium text-muted">
        {title}
      </h2>
      <div className="flex items-center gap-2 text-subhead text-muted tabular">
        {meta}
        {action}
      </div>
    </div>
  );
}
