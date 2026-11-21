import { cn } from '@/lib/cn';
import { OrbitMark } from './OrbitMark';

export function CyrusMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <OrbitMark className="size-6 text-secondary" />
      <span className="font-display text-headline font-semibold tracking-[0.08em] text-fg">CYRUS</span>
    </span>
  );
}
