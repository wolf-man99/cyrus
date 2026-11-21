import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState, ErrorState, SkeletonRows } from '@/components/ui/States';

interface CollectionProps<T> {
  id: string;
  title: string;
  meta?: ReactNode;
  addLabel?: string;
  onAdd?: () => void;
  query: { data?: T[]; isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
  empty: { title: string; description: string };
  render(items: T[]): ReactNode;
  filter?: (item: T) => boolean;
}

/** A domain-specific list (books, investments, ventures…) with loading, error and empty states. */
export function Collection<T>({ id, title, meta, addLabel = 'Add', onAdd, query, empty, render, filter }: CollectionProps<T>) {
  const items = query.data ? (filter ? query.data.filter(filter) : query.data) : undefined;
  return (
    <section aria-labelledby={id}>
      <SectionHeader
        id={id}
        title={title}
        meta={meta}
        action={
          onAdd && (
            <button type="button" onClick={onAdd} className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-secondary hover:text-fg">
              <Plus className="size-4" /> {addLabel}
            </button>
          )
        }
      />
      <div className="mt-2">
        {query.isPending ? (
          <SkeletonRows rows={2} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        ) : items && items.length > 0 ? (
          render(items)
        ) : (
          <EmptyState compact title={empty.title} description={empty.description} />
        )}
      </div>
    </section>
  );
}
