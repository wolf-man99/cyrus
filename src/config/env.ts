import { z } from 'zod';

/**
 * Public, browser-safe configuration. Only `VITE_*` variables reach the client bundle,
 * so secrets (e.g. the OpenAI key) must never be defined here — they live in
 * Supabase Edge Function secrets.
 */
const schema = z.object({
  VITE_SUPABASE_URL: z.url().optional().or(z.literal('')),
  VITE_SUPABASE_ANON_KEY: z.string().optional(),
});

const parsed = schema.safeParse(import.meta.env);
const raw = parsed.success ? parsed.data : {};

const supabaseUrl = raw.VITE_SUPABASE_URL?.trim() || null;
const supabaseAnonKey = raw.VITE_SUPABASE_ANON_KEY?.trim() || null;

if (!parsed.success && import.meta.env.DEV) {
  console.warn('[cyrus] Invalid environment configuration — falling back to demo mode.', parsed.error.issues);
}

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  /** True when the app can talk to a real backend. Otherwise CYRUS runs in clearly-labelled demo mode. */
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
} as const;

/** URL of the server-side AI proxy (Supabase Edge Function). The OpenAI key never leaves the server. */
export function assistantFunctionUrl(): string | null {
  return env.supabaseUrl ? `${env.supabaseUrl.replace(/\/$/, '')}/functions/v1/cyrus` : null;
}
