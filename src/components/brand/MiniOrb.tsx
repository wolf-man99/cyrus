import { cn } from '@/lib/cn';

/** Small, CSS-only animated Cyrus orb for navigation and entry points. */
export function MiniOrb({ className, active = true }: { className?: string; active?: boolean }) {
  return (
    <span aria-hidden className={cn('mini-orb relative inline-block size-7 shrink-0', !active && 'mini-orb--muted', className)}>
      <span className="mini-orb__glow" />
      <span className="mini-orb__core" />
      <span className="mini-orb__shine" />
    </span>
  );
}
