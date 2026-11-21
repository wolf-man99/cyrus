import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import { addDays, periodRange, type ISODate, type Period } from '@/lib/dates';
import { summarizePeriod } from '@/domain/summary';
import { useActivities, useExpenses, useGoals, useIncome, useMetrics, useTasksBetween, useWeightLogs, useWorkouts } from './useData';
import { qk } from './keys';

/**
 * Everything that happened in a day, week or month, summarised from the user's records.
 * Built from the same cached queries as the rest of the app, so it stays current as they log.
 */
export function usePeriodSummary(period: Period, start: ISODate) {
  const repo = useRepository();
  const { from, to } = periodRange(period, start);
  const r = { from, to };
  const tasks = useTasksBetween(from, to);
  const habits = useQuery({ queryKey: qk.habits, queryFn: () => repo.habits.list() });
  const habitLogs = useQuery({ queryKey: qk.habitLogs(from, to), queryFn: () => repo.habits.logsBetween(from, to) });
  const workouts = useWorkouts(r);
  const weight = useWeightLogs(r);
  const expenses = useExpenses(r);
  const income = useIncome(r);
  const activities = useActivities(r);
  // Earlier goal progress, so "from → to" for goals reflects where the period started.
  const priorProgress = useActivities({ kinds: ['goal_progress'], to: addDays(from, -1), limit: 300 });
  const metrics = useMetrics(r);
  const goals = useGoals({ includeArchived: true });
  const all = [tasks, habits, habitLogs, workouts, weight, expenses, income, activities, priorProgress, metrics, goals];
  const ready = all.every((q) => q.data !== undefined);

  const summary = useMemo(
    () =>
      ready
        ? summarizePeriod(
            {
              tasks: tasks.data!,
              habits: habits.data!,
              habitLogs: habitLogs.data!,
              workouts: workouts.data!,
              weight: weight.data!,
              expenses: expenses.data!,
              income: income.data!,
              activities: [...activities.data!, ...priorProgress.data!],
              metrics: metrics.data!,
              goals: goals.data!,
            },
            from,
            to,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ready, tasks.data, habits.data, habitLogs.data, workouts.data, weight.data, expenses.data, income.data, activities.data, priorProgress.data, metrics.data, goals.data, from, to],
  );

  return {
    summary,
    activities: activities.data ?? [],
    tasks: tasks.data ?? [],
    goals: goals.data ?? [],
    isPending: !ready && !all.some((q) => q.isError),
    error: all.find((q) => q.error)?.error ?? null,
    refetch: () => all.forEach((q) => void q.refetch()),
  };
}
