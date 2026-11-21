import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { OrbitMark } from '@/components/brand/OrbitMark';

/** Entry point to the Cyrus assistant (Orbit "Get started guide" row). */
export function CyrusLaunchCard() {
  return (
    <Link
      to="/cyrus"
      className="group flex items-center gap-4 rounded-card border border-line bg-surface/75 p-4 transition-colors hover:bg-surface"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-secondary">
        <OrbitMark className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-headline font-semibold">Talk to Cyrus</span>
        <span className="block truncate text-subhead text-muted">Plan your day by voice</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
