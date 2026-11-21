import { Info, MessagesSquare, Plus } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import type { ConversationMessage } from '@/services/assistant';
import type { Conversation } from '@/domain/types';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/dates';
import { ActionChips } from './Captions';

interface HistorySheetProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  messages: ConversationMessage[];
  conversations: Conversation[];
  currentId: string | null;
  onNew(): void;
  onOpenConversation(id: string): void;
}

const time = (iso: string) => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export function HistorySheet({ open, onOpenChange, messages, conversations, currentId, onNew, onOpenConversation }: HistorySheetProps) {
  const past = conversations.filter((c) => c.id !== currentId);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Conversation"
      footer={
        <Button
          variant="secondary"
          block
          leadingIcon={<Plus className="size-4" />}
          onClick={() => {
            onNew();
            onOpenChange(false);
          }}
        >
          New conversation
        </Button>
      }
    >
      {messages.length === 0 ? (
        <EmptyState icon={<MessagesSquare className="size-5" />} title="No messages yet" description="Tap the mic or type to start" className="mb-6" />
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
                <div className={cn('max-w-[85%]', m.role === 'user' ? 'text-right' : '')}>
                  <p className={cn('rounded-[1.25rem] px-4 py-2.5 text-left text-callout', m.role === 'user' ? 'rounded-br-md bg-primary text-fg' : 'rounded-bl-md bg-white/[0.07] text-fg')}>
                    {m.text}
                  </p>
                  {m.actions && m.actions.length > 0 && <ActionChips actions={m.actions} className="mt-1.5" />}
                </div>
              )}
              <span className="mt-1 px-1 text-caption text-subtle">
                {m.role === 'user' ? 'You' : m.role === 'assistant' ? (m.demo ? 'Demo response' : 'Cyrus') : 'System'} · {time(m.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      )}

      {past.length > 0 && (
        <section aria-labelledby="past-conversations" className="mt-8 pb-2">
          <h3 id="past-conversations" className="mb-2 text-footnote font-medium text-muted">
            Earlier conversations
          </h3>
          <ul className="divide-y divide-line overflow-hidden rounded-row border border-line">
            {past.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenConversation(c.id);
                    onOpenChange(false);
                  }}
                  className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                >
                  <span className="truncate text-callout">{c.title ?? 'Untitled conversation'}</span>
                  <span className="shrink-0 text-footnote text-muted">{timeAgo(c.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Sheet>
  );
}
