import { useQuery } from '@tanstack/react-query';
import { useRepository } from '@/app/providers/DataProvider';
import { qk } from './keys';

export function useProfile() {
  const repo = useRepository();
  return useQuery({ queryKey: qk.profile, queryFn: () => repo.profile.get(), staleTime: 5 * 60_000 });
}
