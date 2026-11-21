import type { Goal } from './types';

/**
 * 0..1 progress towards a goal, or null when it can't be measured.
 *
 * With a start value, progress is the distance covered from start to target, so goals that
 * count down (lose weight, pay off debt) work as well as goals that count up. Without one,
 * only count-up goals from zero can be measured.
 */
export function goalProgress(goal: Pick<Goal, 'startValue' | 'targetValue' | 'currentValue' | 'status'>): number | null {
  if (goal.status === 'completed') return 1;
  const { targetValue: target, currentValue: current } = goal;
  if (target === null) return null;
  const start = goal.startValue ?? 0;
  if (target === start) return current === target ? 1 : 0;
  const ratio = (current - start) / (target - start);
  if (goal.startValue === null && current > target && target > 0) return null;
  return Math.max(0, Math.min(1, ratio));
}

/** Goals that can't be measured numerically are milestones: done or not done. */
export function isMilestone(goal: Pick<Goal, 'targetValue'>): boolean {
  return goal.targetValue === null;
}

export const GOAL_CATEGORIES: Partial<Record<Goal['domain'], { id: string; label: string }[]>> = {
  physical: [
    { id: 'fitness', label: 'Fitness' },
    { id: 'body', label: 'Body' },
    { id: 'health', label: 'Health' },
  ],
  mental: [
    { id: 'wellbeing', label: 'Wellbeing' },
    { id: 'focus', label: 'Focus' },
  ],
  intellectual: [
    { id: 'learning', label: 'Learning' },
    { id: 'skills', label: 'Skills' },
  ],
  financial: [
    { id: 'savings', label: 'Savings' },
    { id: 'debt', label: 'Debt' },
    { id: 'investing', label: 'Investing' },
  ],
  social: [
    { id: 'communication', label: 'Communication' },
    { id: 'public_speaking', label: 'Public speaking' },
    { id: 'relationships', label: 'Relationships' },
  ],
  career: [
    { id: 'professional', label: 'Professional' },
    { id: 'skills', label: 'Skills' },
  ],
  entrepreneurship: [
    { id: 'revenue', label: 'Revenue' },
    { id: 'validation', label: 'Validation' },
    { id: 'business', label: 'Business' },
  ],
};
