import { Info, MessagesSquare } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import type { ConversationMessage } from '@/services/ai';
import { cn } from '@/lib/cn';

interface HistorySheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  messages: ConversationMessage[];
  onClear(): void;
}

const time = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export function HistorySheet({ open, onOpenChange, messages, onClear }: HistorySheetProps) {
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Conversation"
      description="This session’s messages with Cyrus"
      footer={
        messages.length > 0 ? (
          <Button variant="secondary" block onClick={onClear}>
            Clear conversation
          </Button>
        ) : undefined
      }
    >
      {messages.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="size-5" />}
          title="No messages yet"
          description="Hold the mic or type to start a conversation"
          className="mb-6"
        />
      ) : (
        <ol className="space-y-3 pb-2">
          {messages.map((m) => (
            <li key={m.id} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
              {m.role === 'notice' ? (
                <p className="flex w-full items-start gap-2 rounded-2xl border border-warning/20 bg-warning/[0.06] px-3.5 py-2.5 text-subhead text-warning">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  {m.text}
                </p>
              ) : (
                <p
                  className={cn(
                    'max-w-[85%] rounded-[1.25rem] px-4 py-2.5 text-callout',
                    m.role === 'user' ? 'rounded-br-md bg-primary text-fg' : 'rounded-bl-md bg-white/[0.07] text-fg',
                  )}
                >
                  {m.text}
                </p>
              )}
              <span className="mt-1 px-1 text-caption text-subtle">
                {m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Cyrus' : 'System'} · {time(m.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Sheet>
  );
}
