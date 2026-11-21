import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import { addDays, type ISODate } from '@/lib/dates';
import { uid } from '@/lib/id';
import type { HabitLog } from '@/domain/types';
import type { NewHabit } from '@/domain/schemas';
import { STREAK_WINDOW_DAYS, withHabitState } from '@/domain/habits';
import { qk } from './keys';

export function useHabitsForDay(date: ISODate) {
  const repo = useRepository();
  const from = addDays(date, -STREAK_WINDOW_DAYS);
  const habits = useQuery({ queryKey: qk.habits, queryFn: () => repo.habits.list() });
  const logs = useQuery({ queryKey: qk.habitLogs(from, date), queryFn: () => repo.habits.logsBetween(from, date) });

  const data = useMemo(
    () => (habits.data && logs.data ? withHabitState(habits.data, logs.data, date) : undefined),
    [habits.data, logs.data, date],
  );

  return {
    data,
    isPending: habits.isPending || logs.isPending,
    isError: habits.isError || logs.isError,
    error: habits.error ?? logs.error,
    refetch: () => Promise.all([habits.refetch(), logs.refetch()]),
  };
}

/** One-tap habit completion with an optimistic update. */
export function useToggleHabit(date: ISODate) {
  const repo = useRepository();
  const qc = useQueryClient();
  const key = qk.habitLogs(addDays(date, -STREAK_WINDOW_DAYS), date);
  return useMutation({
    mutationFn: ({ habitId, done }: { habitId: string; done: boolean }) => repo.habits.setDone(habitId, date, done),
    onMutate: async ({ habitId, done }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<HabitLog[]>(key);
      qc.setQueryData<HabitLog[]>(key, (logs = []) =>
        done
          ? [...logs, { id: uid(), habitId, logDate: date }]
          : logs.filter((l) => !(l.habitId === habitId && l.logDate === date)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => ctx?.previous && qc.setQueryData(key, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });
}

export function useCreateHabit() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewHabit) => repo.habits.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.habits }),
  });
}

export function useArchiveHabit() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => repo.habits.archive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.habits }),
  });
}
