import {
  Award,
  BookOpen,
  Brain,
  CircleDollarSign,
  Flag,
  GraduationCap,
  Handshake,
  Lightbulb,
  Mic,
  NotebookPen,
  PenLine,
  Target,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { LifeDomain } from '@/domain/types';

/**
 * Every simple activity a domain can log, described as data. One generic sheet renders all of
 * them, so adding a new kind of log is a config change, not a new screen.
 */
export interface ActivityKindConfig {
  id: string; // unique key: `${domain}.${kind}`
  domain: LifeDomain;
  kind: string;
  label: string;
  icon: LucideIcon;
  /** Title field; when absent the label is used as the title. */
  title?: { label: string; placeholder: string };
  value?: { label: string; unit: string; presets?: number[]; required?: boolean; currency?: boolean };
  notes?: { label: string; placeholder: string; required?: boolean };
  /** Sub-type chips, stored in details.type. */
  types?: string[];
  /** 1–5 self-rating, stored in details.rating. */
  rating?: string;
}

const k = (c: Omit<ActivityKindConfig, 'id'>): ActivityKindConfig => ({ ...c, id: `${c.domain}.${c.kind}` });

export const ACTIVITY_KINDS: ActivityKindConfig[] = [
  k({ domain: 'mental', kind: 'meditation', label: 'Meditation', icon: Brain, value: { label: 'Minutes', unit: 'min', presets: [5, 10, 15, 20, 30], required: true } }),
  k({ domain: 'mental', kind: 'journal', label: 'Journal', icon: PenLine, notes: { label: 'Entry', placeholder: 'What’s on your mind?', required: true } }),
  k({
    domain: 'mental',
    kind: 'focus',
    label: 'Focus session',
    icon: Timer,
    title: { label: 'What did you focus on?', placeholder: 'e.g. Strategy doc' },
    value: { label: 'Minutes', unit: 'min', presets: [25, 50, 90], required: true },
  }),
  k({ domain: 'intellectual', kind: 'note', label: 'Knowledge note', icon: NotebookPen, title: { label: 'Idea', placeholder: 'e.g. Attention residue' }, notes: { label: 'Note', placeholder: 'What did you learn?', required: true } }),
  k({
    domain: 'social',
    kind: 'social',
    label: 'Social activity',
    icon: Users,
    title: { label: 'What did you do?', placeholder: 'e.g. Dinner with Sam' },
    types: ['Friends', 'Family', 'Networking', 'Event', 'Call'],
  }),
  k({
    domain: 'social',
    kind: 'speaking',
    label: 'Speaking practice',
    icon: Mic,
    title: { label: 'Session', placeholder: 'e.g. Toastmasters speech' },
    value: { label: 'Minutes', unit: 'min', presets: [2, 5, 7, 10] },
    notes: { label: 'What to improve (optional)', placeholder: 'e.g. Slower opening, fewer fillers' },
    rating: 'How did it go?',
  }),
  k({ domain: 'social', kind: 'outreach', label: 'Reached out', icon: Handshake, title: { label: 'Who and why?', placeholder: 'e.g. Thanked my mentor' } }),
  k({ domain: 'career', kind: 'achievement', label: 'Achievement', icon: Award, title: { label: 'What did you achieve?', placeholder: 'e.g. Shipped the onboarding redesign' }, notes: { label: 'Impact (optional)', placeholder: 'Numbers, feedback, what changed' } }),
  k({ domain: 'career', kind: 'milestone', label: 'Milestone', icon: Flag, title: { label: 'Milestone', placeholder: 'e.g. Took ownership of the growth squad' } }),
  k({
    domain: 'entrepreneurship',
    kind: 'revenue',
    label: 'Revenue milestone',
    icon: CircleDollarSign,
    title: { label: 'Milestone', placeholder: 'e.g. Reached $500 MRR' },
    value: { label: 'Monthly revenue', unit: 'currency', required: true, currency: true },
  }),
  k({ domain: 'entrepreneurship', kind: 'milestone', label: 'Business milestone', icon: Flag, title: { label: 'Milestone', placeholder: 'e.g. 1,000 subscribers' } }),
];

export function activityKind(domain: LifeDomain, kind: string): ActivityKindConfig | undefined {
  return ACTIVITY_KINDS.find((a) => a.domain === domain && a.kind === kind);
}

/** Icons and labels for activity kinds logged elsewhere (reading progress, goal updates). */
export const EXTRA_KIND_META: Record<string, { label: string; icon: LucideIcon }> = {
  reading: { label: 'Reading', icon: BookOpen },
  course: { label: 'Course', icon: GraduationCap },
  goal_progress: { label: 'Goal progress', icon: Target },
  idea: { label: 'Idea', icon: Lightbulb },
};
