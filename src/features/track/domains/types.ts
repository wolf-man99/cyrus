import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Goal, Investment, LearningResource, Project, ProjectDomain, ProjectKind, Skill, SkillDomain } from '@/domain/types';
import type { HistoryItem } from '../history';
import type { TrackRange } from '../range';

/** Which sheet a domain wants open. The domain page renders it. */
export type SheetRequest =
  | { type: 'weight' }
  | { type: 'workout' }
  | { type: 'expense' }
  | { type: 'income' }
  | { type: 'mood' }
  | { type: 'report' }
  | { type: 'progress' }
  | { type: 'activity'; kind: string }
  | { type: 'metric'; set: 'body' | 'balances' }
  | { type: 'resource'; resource?: LearningResource }
  | { type: 'skill'; domain: SkillDomain; skill?: Skill }
  | { type: 'project'; domain: ProjectDomain; kind: ProjectKind; project?: Project }
  | { type: 'investment'; investment?: Investment }
  | { type: 'goal'; goal?: Goal };

export interface DomainViewProps {
  range: TrackRange;
  currency: string;
  open(request: SheetRequest): void;
}

export interface HistoryQuery {
  items: HistoryItem[];
  isPending: boolean;
  error: unknown;
  refetch(): void;
}

/**
 * What a life domain contributes to the shared domain page. Every domain fills the same
 * slots, so all seven look and behave alike.
 */
export interface DomainModule {
  quickLogs: { id: string; label: string; icon: LucideIcon; request: SheetRequest }[];
  progressTitle: string;
  Metrics: ComponentType<DomainViewProps>;
  Progress: ComponentType<DomainViewProps>;
  Collections?: ComponentType<DomainViewProps>;
  useHistory(range: TrackRange, currency: string): HistoryQuery;
}

/** Combines several queries' loading and error state. */
export function combine(...queries: { isPending: boolean; error: unknown; refetch: () => unknown }[]) {
  return {
    isPending: queries.some((q) => q.isPending),
    error: queries.find((q) => q.error)?.error ?? null,
    refetch: () => queries.forEach((q) => void q.refetch()),
  };
}

export function money(amount: number, currency: string, compact = false): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: compact || Math.abs(amount) >= 1000 ? 0 : 2,
      notation: compact && Math.abs(amount) >= 10000 ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

/** Previous range of equal length, for "vs previous 30 days" comparisons. */
export function previousRange(range: TrackRange) {
  const from = new Date(`${range.from}T12:00:00`);
  from.setDate(from.getDate() - range.days);
  const to = new Date(`${range.from}T12:00:00`);
  to.setDate(to.getDate() - 1);
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(from), to: iso(to) };
}
