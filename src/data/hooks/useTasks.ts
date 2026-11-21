import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import type { ISODate } from '@/lib/dates';
import type { Task } from '@/domain/types';
import type { NewTask } from '@/domain/schemas';
import { qk } from './keys';

export function useTasksForDay(date: ISODate) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.tasksForDay(date), queryFn: () => repo.tasks.listForDay(date) });
}

export function useUpcomingTasks(date: ISODate, days = 7) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.tasksUpcoming(date), queryFn: () => repo.tasks.listUpcoming(date, days) });
}

export function useCreateTask() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: NewTask) => repo.tasks.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}

/** One-tap completion with an optimistic update. */
export function useToggleTask(date: ISODate) {
  const repo = useRepository();
  const qc = useQueryClient();
  const key = qk.tasksForDay(date);
  return useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => repo.tasks.setCompleted(id, completed),
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Task[]>(key);
      qc.setQueryData<Task[]>(key, (tasks) =>
        tasks?.map((t) => (t.id === id ? { ...t, completedAt: completed ? new Date().toISOString() : null } : t)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => ctx?.previous && qc.setQueryData(key, ctx.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.tasks }),
  });
}
