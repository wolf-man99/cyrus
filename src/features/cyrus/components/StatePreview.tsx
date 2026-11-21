import { CYRUS_STATUSES, type CyrusStatus } from '../conversationMachine';
import { cn } from '@/lib/cn';

interface StatePreviewProps {
  value: CyrusStatus | null;
  onChange(status: CyrusStatus | null): void;
}

/**
 * Demo-only: step through the orb's six visual states.
 * Clearly labelled as a visual preview — it never produces assistant output.
 */
export function StatePreview({ value, onChange }: StatePreviewProps) {
  return (
    <div className="mx-auto w-full max-w-md text-center">
      <p className="text-caption font-medium tracking-wide text-white/60 uppercase">Visual preview · not a conversation</p>
      <div role="radiogroup" aria-label="Preview orb state" className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:justify-center">
        {CYRUS_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={value === s}
            onClick={() => onChange(s)}
            className={cn(
              'h-8 shrink-0 rounded-full px-3 text-footnote font-medium capitalize transition',
              value === s ? 'bg-white text-canvas' : 'bg-white/10 text-white/80 hover:bg-white/15',
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
