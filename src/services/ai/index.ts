import { assistantFunctionUrl, env } from '@/config/env';
import { getSupabase } from '@/data/supabase/client';
import { demoAssistantProvider } from './demoProvider';
import { createProxyAssistantProvider } from './proxyProvider';
import type { AssistantProvider } from './types';

/** Picks the assistant implementation for the current environment. */
export function createAssistantProvider(): AssistantProvider {
  const supabase = getSupabase();
  const url = assistantFunctionUrl();
  if (supabase && url && env.supabaseAnonKey) return createProxyAssistantProvider(supabase, url, env.supabaseAnonKey);
  return demoAssistantProvider;
}

export * from './types';
