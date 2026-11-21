import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import type { LifeDomain } from '@/domain/types';
import type { ExpenseEntry, WeightEntry, WorkoutEntry } from '@/domain/schemas';
import { qk } from './keys';

export function useWeightLogs(limit = 30) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.weight, queryFn: () => repo.weight.list(limit) });
}

export function useLogWeight() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WeightEntry) => repo.weight.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.weight }),
  });
}

export function useWorkouts(limit = 30) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.workouts, queryFn: () => repo.workouts.list(limit) });
}

export function useLogWorkout() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: WorkoutEntry) => repo.workouts.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.workouts }),
  });
}

export function useTransactions(limit = 50) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.transactions, queryFn: () => repo.transactions.list(limit) });
}

export function useLogExpense() {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseEntry) => repo.transactions.createExpense(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.transactions }),
  });
}

export function useGoals(domain?: LifeDomain) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.goals(domain), queryFn: () => repo.goals.list(domain) });
}
