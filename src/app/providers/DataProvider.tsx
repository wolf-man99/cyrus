import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Repository } from '@/data/repository';
import { createDemoRepository } from '@/data/demo/demoRepository';
import { createSupabaseRepository } from '@/data/supabase/supabaseRepository';
import { getSupabase } from '@/data/supabase/client';
import { useAuth } from './AuthProvider';

const RepositoryContext = createContext<Repository | null>(null);

/**
 * Chooses the data source for the current session and scopes the query cache to it,
 * so switching user (or leaving demo mode) can never leak cached data across accounts.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { status, session } = useAuth();
  const userId = session?.user.id ?? null;

  const repository = useMemo<Repository | null>(() => {
    if (status === 'demo') return createDemoRepository();
    const supabase = getSupabase();
    if ((status === 'signed-in' || status === 'recovery') && supabase && userId) return createSupabaseRepository(supabase, userId);
    return null;
  }, [status, userId]);

  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: status !== 'demo' },
          mutations: { retry: 0 },
        },
      }),
    // A fresh cache per data source / user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repository],
  );

  return (
    <RepositoryContext.Provider value={repository}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RepositoryContext.Provider>
  );
}

export function useRepository(): Repository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error('No data source available — user must be signed in or in demo mode');
  return repo;
}

/** True when nothing the user does is persisted. */
export function useIsDemo(): boolean {
  return useContext(RepositoryContext)?.mode === 'demo';
}
