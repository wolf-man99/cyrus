import { useEffect, useRef } from 'react';
import { Info } from 'lucide-react';
import type { ConversationMessage } from '@/services/ai';
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
      className="no-scrollbar mx-auto max-h-[26dvh] w-full max-w-md space-y-2.5 overflow-y-auto px-1 [mask-image:linear-gradient(to_bottom,transparent,black_18%)]"
    >
      <div className="h-3" />
      {recent.map((m) =>
        m.role === 'notice' ? (
          <p
            key={m.id}
            className="flex items-start gap-2 rounded-2xl border border-warning/25 bg-black/35 px-3.5 py-2.5 text-subhead text-warning backdrop-blur-md"
          >
            <Info className="mt-0.5 size-4 shrink-0" />
            {m.text}
          </p>
        ) : (
          <p
            key={m.id}
            className={cn(
              'text-center text-callout leading-snug',
              m.role === 'user' ? 'text-white/65' : 'font-medium text-white',
            )}
          >
            {m.role === 'user' && <span className="sr-only">You said: </span>}
            {m.role === 'assistant' && <span className="sr-only">Cyrus: </span>}
            {m.text}
          </p>
        ),
      )}
    </div>
  );
}
