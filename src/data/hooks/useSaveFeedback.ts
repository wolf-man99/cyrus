import { useCallback } from 'react';
import { useIsDemo } from '@/app/providers/DataProvider';
import { useToast } from '@/app/providers/ToastProvider';

/**
 * Honest save confirmations: in demo mode we never say "saved" —
 * we say the change exists only in this session.
 */
export function useSaveFeedback() {
  const isDemo = useIsDemo();
  const { show } = useToast();

  return {
    saved: useCallback(
      (title: string) =>
        isDemo
          ? show({ tone: 'demo', title, description: 'Demo mode, not saved. Resets when you reload.' })
          : show({ tone: 'success', title }),
      [isDemo, show],
    ),
    failed: useCallback(
      (error: unknown, title = 'Couldn’t save that') =>
        show({ tone: 'error', title, description: error instanceof Error ? error.message : 'Please try again.' }),
      [show],
    ),
  };
}
