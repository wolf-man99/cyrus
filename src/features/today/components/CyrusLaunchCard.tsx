import { Link } from 'react-router';
import { ChevronRight, Mic } from 'lucide-react';
import { MiniOrb } from '@/components/brand/MiniOrb';

/** Prominent entry point to the Cyrus assistant (Orbit "Get started guide" pattern). */
export function CyrusLaunchCard() {
  return (
    <Link
      to="/cyrus"
      className="group relative flex items-center gap-4 overflow-hidden rounded-card border border-secondary/25 bg-gradient-to-br from-primary/25 via-surface/80 to-surface/80 p-4 transition-all duration-300 hover:border-secondary/50 hover:shadow-glow active:scale-[0.99]"
    >
      <div aria-hidden className="absolute -top-10 -left-6 size-32 rounded-full bg-secondary/25 blur-2xl transition-opacity group-hover:opacity-100" />
      <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full bg-black/30">
        <MiniOrb className="size-9" />
      </span>
      <div className="relative min-w-0 flex-1">
        <p className="text-headline font-semibold">Talk to Cyrus</p>
        <p className="truncate text-subhead text-muted">Plan your day or log anything by voice</p>
      </div>
      <span className="relative flex items-center gap-1 text-muted transition-colors group-hover:text-fg">
        <Mic className="size-[18px]" />
        <ChevronRight className="size-5" />
      </span>
    </Link>
  );
}
