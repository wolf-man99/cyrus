import { useMemo, useState } from 'react';
import { History as HistoryIcon, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import { useSaveFeedback } from '@/data/hooks/useSaveFeedback';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { dateOf, relativeDayLabel } from '@/lib/dates';
import { cn } from '@/lib/cn';
import type { HistoryItem } from '../history';
import type { TrackRange } from '../range';

interface HistorySectionProps {
  items: HistoryItem[];
  isPending: boolean;
  error: unknown;
  onRetry(): void;
  range: TrackRange;
}

const PAGE = 20;

/** Everything logged in this domain within the selected range, grouped by day. */
export function HistorySection({ items, isPending, error, onRetry, range }: HistorySectionProps) {
  const [group, setGroup] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);
  const groups = useMemo(() => [...new Set(items.map((i) => i.group))], [items]);
  const filtered = useMemo(
    () => items.filter((i) => !group || i.group === group).sort((a, b) => b.at.localeCompare(a.at)),
    [items, group],
  );
  const days = useMemo(() => {
    const map = new Map<string, HistoryItem[]>();
    for (const item of filtered.slice(0, shown)) {
      const d = dateOf(item.at);
      map.set(d, [...(map.get(d) ?? []), item]);
    }
    return [...map.entries()];
  }, [filtered, shown]);

  return (
    <section aria-labelledby="history-heading">
      <SectionHeader id="history-heading" title="History" meta={`${filtered.length} in ${range.label}`} />
      {groups.length > 1 && (
        <div className="no-scrollbar -mx-4 mt-1 flex gap-1.5 overflow-x-auto px-5 sm:mx-0 sm:px-1" role="tablist" aria-label="Filter history">
          {[null, ...groups].map((g) => (
            <button
              key={g ?? 'all'}
              type="button"
              role="tab"
              aria-selected={group === g}
              onClick={() => {
                setGroup(g);
                setShown(PAGE);
              }}
              className={cn(
                'h-8 shrink-0 rounded-full px-3 text-footnote font-medium transition-colors',
                group === g ? 'bg-white/[0.1] text-fg' : 'text-muted hover:text-fg',
              )}
            >
              {g ?? 'All'}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2">
        {isPending ? (
          <SkeletonRows rows={3} />
        ) : error ? (
          <ErrorState title="Couldn’t load history" error={error} onRetry={onRetry} />
        ) : filtered.length === 0 ? (
          <EmptyState compact icon={<HistoryIcon className="size-5" />} title={`Nothing logged in the ${range.label}`} description="Use the quick log buttons above to add an entry" />
        ) : (
          <div className="space-y-5">
            {days.map(([day, dayItems]) => (
              <div key={day}>
                <p className="mb-2 px-1 text-footnote font-medium text-subtle">{relativeDayLabel(day)}</p>
                <ul className="divide-y divide-line overflow-hidden rounded-row border border-line bg-surface/75">
                  {dayItems.map((item) => (
                    <HistoryRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            ))}
            {filtered.length > shown && (
              <Button variant="secondary" size="sm" className="mx-auto flex" onClick={() => setShown((n) => n + PAGE)}>
                Show more
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const repo = useRepository();
  const qc = useQueryClient();
  const feedback = useSaveFeedback();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const Icon = item.icon;
  const time = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(item.at));

  const remove = async () => {
    if (!item.remove) return;
    setBusy(true);
    try {
      await item.remove(repo);
      await Promise.all(item.roots.map((root) => qc.invalidateQueries({ queryKey: [root] })));
      feedback.saved('Entry deleted');
    } catch (err) {
      feedback.failed(err, 'Couldn’t delete that entry');
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <li className="flex items-center gap-3 py-3 pr-2 pl-4">
      <Icon aria-hidden className="size-4.5 shrink-0 text-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-subhead font-medium">{item.title}</p>
        <p className="truncate text-footnote text-muted">{[time, item.meta].filter(Boolean).join(' · ')}</p>
      </div>
      {item.value && <span className="shrink-0 text-subhead tabular">{item.value}</span>}
      {item.remove &&
        (confirming ? (
          <Button variant="danger" size="sm" loading={busy} onClick={remove} onBlur={() => !busy && setConfirming(false)} autoFocus>
            Delete
          </Button>
        ) : (
          <button
            type="button"
            aria-label={`Delete ${item.title}`}
            onClick={() => setConfirming(true)}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-subtle transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <Trash2 className="size-4" />
          </button>
        ))}
    </li>
  );
}
