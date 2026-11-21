import { useState } from 'react';
import { FlaskConical, Info } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

/** Persistent, honest label for demo mode. Shown on phones; desktop shows it in the side rail. */
export function DemoBanner({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'mx-auto flex items-center gap-2 rounded-full border border-warning/25 bg-warning/[0.08] px-3.5 py-1.5 text-footnote font-medium text-warning transition hover:bg-warning/[0.12]',
          className,
        )}
      >
        <FlaskConical className="size-3.5" />
        Demo mode · nothing is saved
        <Info className="size-3.5 opacity-70" />
      </button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="You’re in demo mode"
        description="CYRUS is running without a backend."
        footer={
          <Button block size="lg" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <ul className="space-y-4 text-callout text-muted">
          <li>
            <span className="font-semibold text-fg">Sample data.</span> Everything you see is example content generated for
            today.
          </li>
          <li>
            <span className="font-semibold text-fg">Nothing is saved.</span> You can tick habits and log entries, but they only
            live in this tab and reset when you reload.
          </li>
          <li>
            <span className="font-semibold text-fg">Cyrus AI is not connected.</span> The assistant’s interface works, but it
            won’t answer until the AI service is set up.
          </li>
          <li>
            To enable secure sign-in, saved data and the assistant, add your Supabase project keys and deploy the{' '}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-footnote text-lilac">cyrus</code> edge function (see
            README).
          </li>
        </ul>
      </Sheet>
    </>
  );
}
