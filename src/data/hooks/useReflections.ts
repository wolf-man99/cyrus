import { useQuery } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import type { ReflectionPeriod } from '@/domain/types';
import { qk } from './keys';

export function useReflections(period: ReflectionPeriod) {
  const repo = useRepository();
  return useQuery({ queryKey: qk.reflections(period), queryFn: () => repo.reflections.list(period) });
}
