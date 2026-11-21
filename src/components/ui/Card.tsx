import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Rounded dark-purple surface. Use sparingly — prefer lists and whitespace over boxes. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card', className)} {...props} />;
}
