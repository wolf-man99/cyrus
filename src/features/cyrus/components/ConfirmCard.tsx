import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { PendingConfirmation } from '@/services/assistant/engine';

/** Cyrus asks before consequential changes. The user can tap, or simply say "yes" or "no". */
export function ConfirmCard({ pending, onConfirm, onDecline }: { pending: PendingConfirmation; onConfirm(): void; onDecline(): void }) {
  return (
    <div role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-desc" className="mx-auto w-full max-w-md rounded-card border border-white/15 bg-black/55 p-4 backdrop-blur-xl">
      <p id="confirm-title" className="flex items-center gap-2 text-footnote font-medium text-white/70">
        <ShieldCheck className="size-4 text-secondary" /> Cyrus wants to make a change
      </p>
      <p id="confirm-desc" className="mt-1.5 text-callout text-white">
        {pending.description}
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" className="flex-1" onClick={onDecline}>
          Don’t
        </Button>
        <Button size="sm" className="flex-1" onClick={onConfirm} autoFocus>
          Confirm
        </Button>
      </div>
      <p className="mt-2 text-center text-caption text-white/50">Or say “yes” or “no”</p>
    </div>
  );
}
