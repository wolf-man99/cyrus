import { useEffect, useRef } from 'react';
import { Check, Info, X } from 'lucide-react';
import type { ConversationMessage } from '@/services/assistant';
import { cn } from '@/lib/cn';

/** Live transcript of the latest exchange, layered over the orb. */
export function Captions({ messages }: { messages: ConversationMessage[] }) {
  const recent = messages.slice(-3);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  if (recent.length === 0) return null;

  return (
    <div
      ref={scroller}
      aria-live="polite"
      className="no-scrollbar mx-auto max-h-[28dvh] w-full max-w-md space-y-2.5 overflow-y-auto px-1 [mask-image:linear-gradient(to_bottom,transparent,black_16%)]"
    >
      <div className="h-3" />
      {recent.map((m) =>
        m.role === 'notice' ? (
          <p key={m.id} className="flex items-start gap-2 rounded-2xl border border-warning/25 bg-black/35 px-3.5 py-2.5 text-subhead text-warning backdrop-blur-md">
            <Info className="mt-0.5 size-4 shrink-0" />
            {m.text}
          </p>
        ) : (
          <div key={m.id} className="text-center">
            {m.demo && <p className="mb-1 text-caption font-medium text-warning">Demo response · not AI</p>}
            <p className={cn('text-callout leading-snug', m.role === 'user' ? 'text-white/65' : 'font-medium text-white')}>
              <span className="sr-only">{m.role === 'user' ? 'You said: ' : 'Cyrus: '}</span>
              {m.text}
            </p>
            {m.actions && m.actions.length > 0 && <ActionChips actions={m.actions} className="mt-2 justify-center" />}
          </div>
        ),
      )}
    </div>
  );
}

/** Receipts for data Cyrus changed, so nothing happens silently. */
export function ActionChips({ actions, className }: { actions: NonNullable<ConversationMessage['actions']>; className?: string }) {
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)} aria-label="Changes made">
      {actions.map((a, i) => (
        <li
          key={i}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-footnote',
            a.ok ? 'bg-success/15 text-success' : 'bg-white/10 text-white/70',
          )}
        >
          {a.ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
          {a.summary}
        </li>
      ))}
    </ul>
  );
}
