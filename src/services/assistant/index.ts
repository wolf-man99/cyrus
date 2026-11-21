import { assistantFunctionUrl, env } from '@/config/env';
import { getSupabase } from '@/data/supabase/client';
import { demoServices } from './demo';
import { createProxyServices } from './proxy';
import type { AssistantServices } from './types';

/** Picks the assistant implementation for the current environment. */
export function createAssistantServices(): AssistantServices {
  const supabase = getSupabase();
  const url = assistantFunctionUrl();
  if (supabase && url && env.supabaseAnonKey) return createProxyServices(supabase, url, env.supabaseAnonKey);
  return demoServices;
}

export * from './types';
