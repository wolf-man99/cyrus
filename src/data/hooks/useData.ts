import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import type { ActivityFilter, DateRange, MetricFilter, Repository } from '@/data/repository';
import type { ISODate } from '@/lib/dates';
import type { LifeDomain, ProjectDomain, ReflectionPeriod, SkillDomain } from '@/domain/types';
import type { ExpenseEntry, WeightEntry, WorkoutEntry } from '@/domain/schemas';
import { qk, type QueryRoot } from './keys';

/* ───────────── Queries ───────────── */

export function useGoals(filter?: { domain?: LifeDomain; includeArchived?: boolean }) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('goals', filter), queryFn: () => repo.goals.list(filter) });
}

export function useMetrics(filter?: MetricFilter) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('metrics', filter), queryFn: () => repo.metrics.list(filter) });
}

export function useActivities(filter?: ActivityFilter, options?: { enabled?: boolean }) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('activities', filter), queryFn: () => repo.activities.list(filter), ...options });
}

export function useWeightLogs(range?: DateRange) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('weight', range), queryFn: () => repo.weight.list(range) });
}

export function useWorkouts(range?: DateRange) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('workouts', range), queryFn: () => repo.workouts.list(range) });
}

export function useExpenses(range?: DateRange) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('expenses', range), queryFn: () => repo.expenses.list(range) });
}

export function useIncome(range?: DateRange) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('income', range), queryFn: () => repo.income.list(range) });
}

export function useInvestments() {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('investments'), queryFn: () => repo.investments.list() });
}

export function useLearning() {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('learning'), queryFn: () => repo.learning.list() });
}

export function useSkills(domain?: SkillDomain) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('skills', domain), queryFn: () => repo.skills.list(domain) });
}

export function useProjects(domain?: ProjectDomain) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('projects', domain), queryFn: () => repo.projects.list(domain) });
}

export function useHealthReports() {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('health-reports'), queryFn: () => repo.healthReports.list() });
}

export function useReflections(period?: ReflectionPeriod) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.list('reflections', period), queryFn: () => repo.reflections.list(period) });
}

export function useReflection(period: ReflectionPeriod, start: ISODate) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.reflection(period, start), queryFn: () => repo.reflections.get(period, start) });
}

export function useTasksBetween(from: ISODate, to: ISODate) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.tasksBetween(from, to), queryFn: () => repo.tasks.listBetween(from, to) });
}

/* ───────────── Mutations ───────────── */

/**
 * A write through the repository that refreshes every cached view of the data it touches.
 * `roots` lists those data sets (e.g. a goal update also writes progress history to activities).
 */
export function useMutate<Args, Result>(fn: (repo: Repository, args: Args) => Promise<Result>, roots: QueryRoot[]) {
  const repo = useRepository();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: Args) => fn(repo, args),
    onSuccess: () => Promise.all(roots.map((root) => qc.invalidateQueries({ queryKey: [root] }))),
  });
}

export const useLogWeight = () => useMutate((r, input: WeightEntry) => r.weight.create(input), ['weight']);
export const useLogWorkout = () => useMutate((r, input: WorkoutEntry) => r.workouts.create(input), ['workouts']);
export const useLogExpense = () => useMutate((r, input: ExpenseEntry) => r.expenses.create(input), ['expenses']);
