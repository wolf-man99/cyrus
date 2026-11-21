import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';

let client: SupabaseClient | null = null;

/** Lazily-created singleton. Returns null in demo mode. */
export function getSupabase(): SupabaseClient | null {
  if (!env.isSupabaseConfigured) return null;
  client ??= createClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
