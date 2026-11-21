import type { LucideIcon } from 'lucide-react';
import { Activity } from 'lucide-react';
import type { Repository } from '@/data/repository';
import type { QueryRoot } from '@/data/hooks/keys';
import type { ActivityLog } from '@/domain/types';
import { formatNumber } from '@/lib/format';
import { activityKind, EXTRA_KIND_META } from './activityKinds';

/** One entry in a domain's history timeline. */
export interface HistoryItem {
  id: string;
  at: string;
  title: string;
  meta?: string;
  value?: string;
  icon: LucideIcon;
  /** Filter group, e.g. "Workouts". */
  group: string;
  remove?: (repo: Repository) => Promise<unknown>;
  roots: QueryRoot[];
}

export function activityItems(activities: ActivityLog[], currency = 'USD'): HistoryItem[] {
  return activities.map((a) => {
    const config = activityKind(a.domain, a.kind);
    const extra = EXTRA_KIND_META[a.kind];
    const label = config?.label ?? extra?.label ?? a.kind.replace(/_/g, ' ');
    const unit = a.unit === 'USD' || config?.value?.currency ? currency : a.unit;
    const value =
      a.value !== null
        ? unit && /^[A-Z]{3}$/.test(unit)
          ? new Intl.NumberFormat(undefined, { style: 'currency', currency: unit, maximumFractionDigits: 0 }).format(a.value)
          : `${formatNumber(a.value)}${unit ? ` ${unit}` : ''}`
        : undefined;
    const type = typeof a.details.type === 'string' ? a.details.type : null;
    const rating = typeof a.details.rating === 'number' ? `${a.details.rating}/5` : null;
    return {
      id: a.id,
      at: a.occurredAt,
      title: a.kind === 'goal_progress' ? `Goal: ${a.title}` : a.title,
      meta: [a.kind === 'goal_progress' ? 'Progress update' : label !== a.title ? label : null, type, rating, a.notes]
        .filter(Boolean)
        .join(' · '),
      value,
      icon: config?.icon ?? extra?.icon ?? Activity,
      group: a.kind === 'goal_progress' ? 'Goals' : label,
      remove: a.kind === 'goal_progress' ? undefined : (repo) => repo.activities.remove(a.id),
      roots: ['activities'],
    };
  });
}
