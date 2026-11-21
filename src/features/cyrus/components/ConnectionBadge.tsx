import type { AssistantConnection } from '@/services/assistant';
import { cn } from '@/lib/cn';

const COPY: Record<AssistantConnection['kind'], { label: string; tone: string }> = {
  demo: { label: 'Demo · AI not connected', tone: 'text-warning bg-warning' },
  checking: { label: 'Connecting…', tone: 'text-white/70 bg-white' },
  connected: { label: 'Connected', tone: 'text-success bg-success' },
  unavailable: { label: 'AI unavailable', tone: 'text-danger bg-danger' },
};

/** Always tells the user whether a real AI is on the other end. */
export function ConnectionBadge({ connection, onClick }: { connection: AssistantConnection; onClick?: () => void }) {
  const { label, tone } = COPY[connection.kind];
  const [text, dot] = tone.split(' ');
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      title={connection.kind === 'unavailable' ? connection.reason : undefined}
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium', text, onClick && 'hover:bg-white/5')}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', dot, connection.kind === 'checking' && 'animate-pulse')} />
      {label}
    </button>
  );
}
