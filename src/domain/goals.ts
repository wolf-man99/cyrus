import type { Goal } from './types';

/**
 * Progress for "count up" goals (books read, money saved). Goals that count down
 * (e.g. reach a lower weight) need a starting baseline we don't store yet, so they
 * report `null` rather than a misleading percentage.
 */
export function goalProgress(goal: Goal): number | null {
  if (goal.targetValue === null || goal.targetValue <= 0) return null;
  if (goal.currentValue > goal.targetValue) return null;
  return goal.currentValue / goal.targetValue;
}
