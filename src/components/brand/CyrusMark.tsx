import { cn } from '@/lib/cn';
import { MiniOrb } from './MiniOrb';

export function CyrusMark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <MiniOrb className="size-7" />
      <span className="font-display text-headline font-bold tracking-[0.28em] text-aurora">CYRUS</span>
    </span>
  );
}
